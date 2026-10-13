import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { NeuroLink } from "@juspay/neurolink";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type LinkAttempts, attemptKey, isUnresolvableName, runLinkResolverAgent } from "../agents/link-resolver.js";
import { CONFIG } from "../pipeline/config.js";

// No real sleeping or retrying: the backoff helper runs the call once and reports the outcome.
vi.mock("../utils/rate-limit.js", () => ({
  sleep: async () => {},
  exponentialBackoff: async <T>(fn: () => Promise<T>) => {
    try {
      return { success: true as const, value: await fn() };
    } catch (err) {
      return { success: false as const, error: String(err) };
    }
  },
}));
vi.mock("../utils/url-check.js", () => ({
  checkUrl: vi.fn(async () => ({ status: "live", httpCode: 200 })),
}));

type MutableState = { LINKS_V2: string; LINK_ATTEMPTS: string };
const state = CONFIG.STATE as unknown as MutableState;
const original = { ...state };

interface Link {
  name: string;
  url: string | null;
  type: string;
  description: string;
  timestamp: string;
}
const link = (name: string, url: string | null = null): Link => ({
  name,
  url,
  type: "shown_on_screen",
  description: "",
  timestamp: "0:01",
});

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

let dir: string;
const writeLinks = (videos: Record<string, Link[]>) =>
  fs.writeFile(
    state.LINKS_V2,
    JSON.stringify(Object.fromEntries(Object.entries(videos).map(([f, links]) => [f, { links }]))),
  );
const readLinks = async (): Promise<Record<string, { links: Link[] }>> =>
  JSON.parse(await fs.readFile(state.LINKS_V2, "utf8"));
const writeAttempts = (a: LinkAttempts) => fs.writeFile(state.LINK_ATTEMPTS, JSON.stringify(a));
const readAttempts = async (): Promise<LinkAttempts> => {
  try {
    return JSON.parse(await fs.readFile(state.LINK_ATTEMPTS, "utf8"));
  } catch {
    return {};
  }
};

/** A fake model that answers each lookup with `reply(prompt)`; throws if the reply is an Error. */
function fakeModel(reply: (prompt: string) => string | Error) {
  const generate = vi.fn(async (opts: { input: { text: string } }) => {
    const r = reply(opts.input.text);
    if (r instanceof Error) throw r;
    return { content: r, finishReason: "stop", stopReason: "completed" };
  });
  return { generate, nl: { generate } as unknown as NeuroLink };
}
const asked = (generate: ReturnType<typeof fakeModel>["generate"]) =>
  generate.mock.calls.map((c) => /for "([^"]+)"/.exec(c[0].input.text)?.[1]);

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "link-resolver-"));
  state.LINKS_V2 = path.join(dir, "links_v2.json");
  state.LINK_ATTEMPTS = path.join(dir, "link_attempts.json");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  Object.assign(state, original);
  vi.restoreAllMocks();
  await fs.rm(dir, { recursive: true, force: true });
});

describe("attemptKey", () => {
  it("ignores case and surrounding whitespace in the name and the hint", () => {
    expect(attemptKey("  Claude Code ", " See Bio ")).toBe(attemptKey("claude code", "see bio"));
  });
  it("treats the same name with a different hint as a different question", () => {
    expect(attemptKey("foo", null)).not.toBe(attemptKey("foo", "see bio"));
  });
});

describe("isUnresolvableName", () => {
  it.each([
    "localhost",
    "LOCALHOST:3000",
    "127.0.0.1",
    "127.0.0.1:8890/api",
    "0.0.0.0:80",
    "192.168.1.5",
    "[::1]:3000",
  ])("flags %j", (name) => expect(isUnresolvableName(name)).toBe(true));
  it.each(["Website", "blog", "RAG", "LLM API", "Free LLM API", "FTP", "MP4", "AI", "Dashboards"])(
    "flags the generic word %j",
    (name) => expect(isUnresolvableName(name)).toBe(true),
  );
  // Each of these is a name the model has really resolved, or a real tool; none may be skipped.
  it.each([
    "localhost nullmotion",
    "/v1/systemone schema",
    "skillry video link (hover)",
    "LLM",
    "Claude Code",
    "Open WebUI",
    "uv",
    "next.js",
    "1.2.3",
    "RAG pipeline",
  ])("does not flag %j", (name) => expect(isUnresolvableName(name)).toBe(false));
});

describe("runLinkResolverAgent failure cache", () => {
  it("asks once, remembers the refusal, and does not ask again on the next run", async () => {
    await writeLinks({ "a.mp4": [link("Foo"), link("Bar")], "b.mp4": [link("Foo")] });
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(asked(generate).sort()).toEqual(["Bar", "Foo"]); // Foo once, though two videos mention it
    const attempts = await readAttempts();
    expect(Object.keys(attempts).sort()).toEqual(["bar|", "foo|"]);
    expect(attempts["foo|"].outcome).toBe("none");

    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(2); // nothing new was asked
  });

  it("asks again once a failure is older than the TTL", async () => {
    await writeLinks({ "a.mp4": [link("Foo")] });
    await writeAttempts({ "foo|": { attempted_at: daysAgo(CONFIG.LINK_RETRY_TTL_DAYS + 1), outcome: "none" } });
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(1);
    const refreshed = (await readAttempts())["foo|"];
    expect(Date.now() - Date.parse(refreshed.attempted_at)).toBeLessThan(DAY_MS); // timestamp renewed
  });

  it("still skips a failure that is younger than the TTL", async () => {
    await writeLinks({ "a.mp4": [link("Foo")] });
    await writeAttempts({ "foo|": { attempted_at: daysAgo(CONFIG.LINK_RETRY_TTL_DAYS - 1), outcome: "none" } });
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(generate).not.toHaveBeenCalled();
  });

  it("re-asks at most LINK_RETRY_MAX_PER_RUN expired names and leaves the rest for later runs", async () => {
    const total = CONFIG.LINK_RETRY_MAX_PER_RUN + 5;
    const names = Array.from({ length: total }, (_, i) => `Tool ${i}`);
    await writeLinks({ "a.mp4": names.map((n) => link(n)) });
    const expired = daysAgo(CONFIG.LINK_RETRY_TTL_DAYS + 5);
    await writeAttempts(
      Object.fromEntries(names.map((n) => [attemptKey(n, null), { attempted_at: expired, outcome: "none" as const }])),
    );
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(CONFIG.LINK_RETRY_MAX_PER_RUN);
    const after = Object.values(await readAttempts());
    expect(after).toHaveLength(total); // none forgotten
    expect(after.filter((a) => a.attempted_at === expired)).toHaveLength(5); // the deferred ones are untouched
  });

  it("applies a resolved URL to every link with that name and clears the failure record", async () => {
    await writeLinks({ "a.mp4": [link("Foo")], "b.mp4": [link("foo"), link("Other", "https://other.example/")] });
    await writeAttempts({ "foo|": { attempted_at: daysAgo(CONFIG.LINK_RETRY_TTL_DAYS + 1), outcome: "none" } });
    const { generate, nl } = fakeModel(() => "https://foo.example/");

    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(1);
    const links = await readLinks();
    expect(links["a.mp4"].links[0].url).toBe("https://foo.example/");
    expect(links["b.mp4"].links[0].url).toBe("https://foo.example/");
    expect(links["b.mp4"].links[1].url).toBe("https://other.example/");
    expect(await readAttempts()).toEqual({});
  });

  it("does not remember a lookup that errored, so the name is asked again next run", async () => {
    await writeLinks({ "a.mp4": [link("Foo")] });
    const { generate, nl } = fakeModel(() => new Error("ECONNRESET"));

    await runLinkResolverAgent(nl);
    expect(await readAttempts()).toEqual({});
    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("records an answer the validator rejects as invalid and never stores it as a link", async () => {
    await writeLinks({ "a.mp4": [link("Foo")] });
    const { generate, nl } = fakeModel(() => "https://localhost/"); // no dot in the host: rejected

    await runLinkResolverAgent(nl);
    expect((await readAttempts())["foo|"]?.outcome).toBe("invalid");
    expect((await readLinks())["a.mp4"].links[0].url).toBeNull();
    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(1); // and an invalid answer is not re-asked either
  });

  it("records a URL that turns out to be dead as dead", async () => {
    const { checkUrl } = await import("../utils/url-check.js");
    vi.mocked(checkUrl).mockResolvedValueOnce({ status: "dead", httpCode: 404 } as Awaited<
      ReturnType<typeof checkUrl>
    >);
    await writeLinks({ "a.mp4": [link("Foo")] });
    const { nl } = fakeModel(() => "https://foo.example/gone");

    await runLinkResolverAgent(nl);
    expect((await readAttempts())["foo|"]?.outcome).toBe("dead");
    expect((await readLinks())["a.mp4"].links[0].url).toBeNull();
  });

  it("treats the same name with a new hint URL as a new question", async () => {
    await writeLinks({ "a.mp4": [link("Foo", "see bio")] });
    await writeAttempts({ "foo|": { attempted_at: daysAgo(1), outcome: "none" } }); // asked before, with no hint
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(Object.keys(await readAttempts()).sort()).toEqual(["foo|see bio"]);
  });

  it("forgets failures for names that are no longer unresolved", async () => {
    await writeLinks({ "a.mp4": [link("Foo")] });
    await writeAttempts({
      "foo|": { attempted_at: daysAgo(1), outcome: "none" },
      "gone|": { attempted_at: daysAgo(1), outcome: "none" },
    });
    const { nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(Object.keys(await readAttempts())).toEqual(["foo|"]);
  });
});

describe("runLinkResolverAgent unresolvable names", () => {
  it("never asks the model about them but leaves the links in place", async () => {
    await writeLinks({ "a.mp4": [link("127.0.0.1"), link("Website"), link("Real Tool")] });
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(asked(generate)).toEqual(["Real Tool"]);
    const links = (await readLinks())["a.mp4"].links;
    expect(links.map((l) => l.name)).toEqual(["127.0.0.1", "Website", "Real Tool"]);
    expect(links.every((l) => l.url === null)).toBe(true);
    expect(Object.keys(await readAttempts())).toEqual(["real tool|"]);
  });

  it("still asks when such a name arrived with a hint URL", async () => {
    await writeLinks({ "a.mp4": [link("Website", "see bio")] });
    const { generate, nl } = fakeModel(() => "NONE");

    await runLinkResolverAgent(nl);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
