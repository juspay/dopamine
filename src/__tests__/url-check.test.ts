import { describe, it, expect, vi, afterEach } from "vitest";
import { checkUrl, checkUrls } from "../utils/url-check.js";
import type { UrlCheckResult } from "../utils/url-check.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response-like object accepted by the mocked global fetch. */
function makeResponse(
  status: number,
  headers: Record<string, string> = {},
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    // The implementation never reads the body for liveness checks
  } as unknown as Response;
}

/** Build a redirect Response pointing to `location`. */
function makeRedirect(status: number, location: string): Response {
  return makeResponse(status, { location });
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// checkUrl — basic status classification
// ---------------------------------------------------------------------------

describe("checkUrl() — 2xx → live", () => {
  it("returns 'live' for a 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200)));
    const result = await checkUrl("https://example.com/");
    expect(result.status).toBe("live");
    expect(result.httpCode).toBe(200);
    expect(result.finalUrl).toBe("https://example.com/");
  });

  it("returns 'live' for a 206 Partial Content response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(206)));
    const result = await checkUrl("https://example.com/file");
    expect(result.status).toBe("live");
    expect(result.httpCode).toBe(206);
  });
});

describe("checkUrl() — 3xx → redirect", () => {
  it("follows a single redirect and returns 'live' for the final 200", async () => {
    const fetchMock = vi
      .fn()
      // First call: 301 → /new
      .mockResolvedValueOnce(makeRedirect(301, "https://example.com/new"))
      // Second call: 200
      .mockResolvedValueOnce(makeResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkUrl("https://example.com/old");
    // A 2xx final response is always "live", even if we followed redirects to get here.
    expect(result.status).toBe("live");
    expect(result.finalUrl).toBe("https://example.com/new");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns 'redirect' if the final hop itself is a 3xx with no Location", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeResponse(302)), // no location header
    );
    const result = await checkUrl("https://example.com/bounce");
    expect(result.status).toBe("redirect");
  });
});

describe("checkUrl() — 403 → protected (NOT dead)", () => {
  it("classifies 403 as 'protected'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(403)));
    const result = await checkUrl("https://www.unrealengine.com/");
    expect(result.status).toBe("protected");
    expect(result.httpCode).toBe(403);
  });

  it("classifies 401 as 'protected'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(401)));
    const result = await checkUrl("https://api.example.com/private");
    expect(result.status).toBe("protected");
  });

  it("classifies 429 as 'protected'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(429)));
    const result = await checkUrl("https://www.npmjs.com/package/mercury-agent");
    expect(result.status).toBe("protected");
  });

  it("classifies 405 as 'protected'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(405)));
    const result = await checkUrl("https://example.com/method-not-allowed");
    expect(result.status).toBe("protected");
  });

  it("classifies 451 as 'protected'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(451)));
    const result = await checkUrl("https://example.com/legal");
    expect(result.status).toBe("protected");
  });
});

describe("checkUrl() — 404/410 → dead", () => {
  it("classifies 404 as 'dead'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(404)));
    const result = await checkUrl("https://github.com/opencua/opencua-72b");
    expect(result.status).toBe("dead");
    expect(result.httpCode).toBe(404);
  });

  it("classifies 410 as 'dead'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(410)));
    const result = await checkUrl("https://example.com/gone-forever");
    expect(result.status).toBe("dead");
  });
});

describe("checkUrl() — 5xx → server_error", () => {
  it("classifies 500 as 'server_error'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(500)));
    const result = await checkUrl("https://example.com/boom");
    expect(result.status).toBe("server_error");
    expect(result.httpCode).toBe(500);
  });

  it("classifies 503 as 'server_error'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(503)));
    const result = await checkUrl("https://example.com/unavailable");
    expect(result.status).toBe("server_error");
  });
});

// ---------------------------------------------------------------------------
// CRITICAL: DNS/network errors → "error", never "dead"
// ---------------------------------------------------------------------------

describe("checkUrl() — DNS/network failure → 'error' (NEVER 'dead')", () => {
  it("returns 'error' for ENOTFOUND (DNS failure)", async () => {
    const dnsError = Object.assign(new Error("getaddrinfo ENOTFOUND no-such-host.invalid"), {
      code: "ENOTFOUND",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(dnsError));

    const result = await checkUrl("https://no-such-host.invalid/", { retries: 0 });
    expect(result.status).toBe("error");
    // Crucially: must NOT be "dead"
    expect(result.status).not.toBe("dead");
    expect(result.httpCode).toBeNull();
  });

  it("returns 'error' for EAI_AGAIN (transient DNS)", async () => {
    const dnsError = new Error("getaddrinfo EAI_AGAIN resolver.invalid");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(dnsError));

    const result = await checkUrl("https://example.com/", { retries: 0 });
    expect(result.status).toBe("error");
    expect(result.status).not.toBe("dead");
  });

  it("returns 'error' for ECONNREFUSED", async () => {
    const connError = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:9999"), {
      code: "ECONNREFUSED",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(connError));

    const result = await checkUrl("https://localhost:9999/", { retries: 0 });
    expect(result.status).toBe("error");
    expect(result.status).not.toBe("dead");
  });

  it("returns 'error' for ECONNRESET", async () => {
    const resetError = Object.assign(new Error("read ECONNRESET"), {
      code: "ECONNRESET",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(resetError));

    const result = await checkUrl("https://example.com/reset", { retries: 0 });
    expect(result.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// Timeout → "timeout"
// ---------------------------------------------------------------------------

describe("checkUrl() — AbortError → 'timeout'", () => {
  it("returns 'timeout' when fetch is aborted", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const result = await checkUrl("https://slow.example.com/", { retries: 0 });
    expect(result.status).toBe("timeout");
    expect(result.httpCode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Empty / invalid input → "no_url"
// ---------------------------------------------------------------------------

describe("checkUrl() — empty/invalid input → 'no_url'", () => {
  it("returns 'no_url' for empty string", async () => {
    const result = await checkUrl("");
    expect(result.status).toBe("no_url");
    expect(result.httpCode).toBeNull();
    expect(result.finalUrl).toBeNull();
  });

  it("returns 'no_url' for whitespace-only string", async () => {
    const result = await checkUrl("   ");
    expect(result.status).toBe("no_url");
  });

  it("returns 'no_url' for a non-HTTP string", async () => {
    const result = await checkUrl("ftp://example.com/file");
    expect(result.status).toBe("no_url");
  });

  it("returns 'no_url' for a bare domain without scheme", async () => {
    const result = await checkUrl("example.com");
    expect(result.status).toBe("no_url");
  });
});

// ---------------------------------------------------------------------------
// Retry behaviour
// ---------------------------------------------------------------------------

describe("checkUrl() — retry on transient failures", () => {
  it("retries once on 'error' and returns the second attempt's result", async () => {
    const dnsError = new Error("ENOTFOUND transient");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(dnsError)
      .mockResolvedValueOnce(makeResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    // Disable backoff delay in tests via a very short retry base
    const result = await checkUrl("https://example.com/", { retries: 1 });
    // Second attempt succeeded → live
    expect(result.status).toBe("live");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on a definitive 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(404));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkUrl("https://example.com/gone", { retries: 3 });
    expect(result.status).toBe("dead");
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retries
  });

  it("does NOT retry on a 403 protected response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(403));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkUrl("https://example.com/private", { retries: 3 });
    expect(result.status).toBe("protected");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// checkUrls — bulk / concurrency
// ---------------------------------------------------------------------------

describe("checkUrls() — bulk URL checking", () => {
  it("returns a Map with results for every input URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeResponse(200)),
    );

    const urls = [
      "https://ollama.com/library/gemma",
      "https://cloud.ouraring.com/docs/",
      "https://ohmo.ai/",
    ];
    const results = await checkUrls(urls, { retries: 0 });

    expect(results.size).toBe(3);
    for (const url of urls) {
      expect(results.get(url)?.status).toBe("live");
    }
  });

  it("deduplicates URLs — each unique URL is fetched only once", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const urls = [
      "https://example.com/",
      "https://example.com/",
      "https://example.com/",
    ];
    const results = await checkUrls(urls, { retries: 0 });

    expect(results.size).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles a mix of statuses correctly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(200)) // live
      .mockResolvedValueOnce(makeResponse(404)) // dead
      .mockResolvedValueOnce(makeResponse(403)); // protected
    vi.stubGlobal("fetch", fetchMock);

    const urls = [
      "https://live.example.com/",
      "https://dead.example.com/",
      "https://bot-blocked.example.com/",
    ];
    const results = await checkUrls(urls, { retries: 0 });

    expect(results.get(urls[0])?.status).toBe("live");
    expect(results.get(urls[1])?.status).toBe("dead");
    expect(results.get(urls[2])?.status).toBe("protected");
  });

  it("returns a Map entry for an empty-string URL", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const results = await checkUrls([""], { retries: 0 });
    expect(results.get("")?.status).toBe("no_url");
  });
});

// ---------------------------------------------------------------------------
// UrlCheckResult shape
// ---------------------------------------------------------------------------

describe("UrlCheckResult shape", () => {
  it("always includes url, status, httpCode, finalUrl fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200)));
    const result: UrlCheckResult = await checkUrl("https://example.com/");

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("httpCode");
    expect(result).toHaveProperty("finalUrl");
  });

  it("sets url to the original input (even after redirect)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(makeRedirect(301, "https://example.com/new"))
        .mockResolvedValueOnce(makeResponse(200)),
    );
    const result = await checkUrl("https://example.com/old");
    expect(result.url).toBe("https://example.com/old");
    expect(result.finalUrl).toBe("https://example.com/new");
  });
});
