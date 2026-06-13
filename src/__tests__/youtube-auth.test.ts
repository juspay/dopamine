// src/__tests__/youtube-auth.test.ts
import { describe, it, expect } from "vitest";
import { buildOAuthClient, type YoutubeAuthEnv } from "../sources/youtube/auth.js";

const valid: YoutubeAuthEnv = { clientId: "id", clientSecret: "secret", refreshToken: "refresh" };

describe("buildOAuthClient", () => {
  it("returns a client with the refresh token set when all fields present", () => {
    const c = buildOAuthClient(valid);
    expect(typeof c.generateAuthUrl).toBe("function");
    expect(c.credentials.refresh_token).toBe("refresh");
  });
  it("throws naming the missing var", () => {
    expect(() => buildOAuthClient({ ...valid, clientId: undefined })).toThrow(/YOUTUBE_CLIENT_ID/);
    expect(() => buildOAuthClient({ ...valid, clientSecret: undefined })).toThrow(/YOUTUBE_CLIENT_SECRET/);
    expect(() => buildOAuthClient({ ...valid, refreshToken: undefined })).toThrow(/YOUTUBE_REFRESH_TOKEN/);
  });
});
