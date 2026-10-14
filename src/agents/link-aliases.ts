/**
 * Official pages for a few products the link lookup cannot resolve. The model
 * answers NONE for every one of these, even with a relaxed prompt; relaxing it
 * trades the gap for confident wrong answers (GLM became a graphics maths
 * library, OpenClaw an unrelated game port). A checked-in URL cannot be wrong
 * that way, but it can go stale, so keep this to products with a stable home and
 * re-check the URLs when one is added.
 *
 * The table also wins over what is already stored, so every video agrees: the
 * same names were stored as the vendor's front page (Claude Code as anthropic.com,
 * Codex as openai.com/blog), as the wrong repository (Gemini CLI as reidjs/gemini-cli,
 * OpenClaw as puni-puni/OpenClaw) or as an unrelated page. A stored URL is kept when
 * it is the page below, a page under it, or under one of the `keep` prefixes: other
 * official or deliberately different pages that were seen for the name.
 *
 * Keys are lower-case names exactly as the extractor writes them; only an exact
 * match applies, so "claude code login" or "codex agent" are not aliases of these.
 */
interface KnownLink {
  url: string;
  keep?: readonly string[];
}

const CLAUDE_CODE: KnownLink = {
  url: "https://claude.com/product/claude-code",
  keep: [
    "https://docs.anthropic.com/en/docs/agents-and-tools/claude-code",
    "https://github.com/anthropics/claude-code",
  ],
};
const OPENAI_GPT_OSS: KnownLink = { url: "https://github.com/openai/gpt-oss" };

export const KNOWN_LINKS: Readonly<Record<string, KnownLink>> = {
  "claude code": CLAUDE_CODE,
  "claude-code": CLAUDE_CODE,
  // codex.gitnexus.io is shown on screen in GitNexus videos and may be a different "Codex".
  codex: { url: "https://github.com/openai/codex", keep: ["https://codex.gitnexus.io"] },
  "gemini cli": { url: "https://github.com/google-gemini/gemini-cli" },
  openclaw: { url: "https://github.com/openclaw/openclaw", keep: ["https://openclaw.ai"] },
  "gpt-oss": OPENAI_GPT_OSS,
  "gpt-oss-120b": OPENAI_GPT_OSS,
};

export function knownLinkFor(name: string): string | null {
  return KNOWN_LINKS[name.trim().toLowerCase()]?.url ?? null;
}

/** Hosts and paths compare without case, scheme-www, trailing slash or query. */
function normalize(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

const isUnder = (url: string, base: string): boolean => {
  const u = normalize(url);
  const b = normalize(base);
  return u === b || u.startsWith(`${b}/`);
};

/** Whether a stored URL for an aliased name can stay: it is the table's page, under it, or under a `keep` prefix. */
export function agreesWithKnownLink(name: string, stored: string): boolean {
  const known = KNOWN_LINKS[name.trim().toLowerCase()];
  if (!known) return true;
  return [known.url, ...(known.keep ?? [])].some((base) => isUnder(stored, base));
}
