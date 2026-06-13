// src/__tests__/vtt.test.ts
import { describe, it, expect } from "vitest";
import { vttToText } from "../utils/vtt.js";

describe("vttToText", () => {
  it("strips header, cue indices, timing lines, and inline tags", () => {
    const vtt = [
      "WEBVTT", "",
      "1",
      "00:00:01.000 --> 00:00:03.000",
      "<c>Hello</c> world", "",
      "2",
      "00:00:03.000 --> 00:00:05.000",
      "<00:00:03.500>Second line", "",
    ].join("\n");
    expect(vttToText(vtt)).toBe("Hello world\nSecond line");
  });

  it("strips yt-dlp metadata header lines (Kind: captions, Language: en)", () => {
    // Real yt-dlp VTT files include metadata lines between WEBVTT and the first
    // blank line; these must never appear in the extracted text.
    const vtt = [
      "WEBVTT",
      "Kind: captions",
      "Language: en",
      "",
      "1",
      "00:00:01.000 --> 00:00:03.000",
      "Hello world", "",
      "2",
      "00:00:03.000 --> 00:00:05.000",
      "Second line", "",
    ].join("\n");
    expect(vttToText(vtt)).toBe("Hello world\nSecond line");
  });

  it("collapses consecutive duplicate lines (rolling auto-captions)", () => {
    const vtt = [
      "WEBVTT", "",
      "00:00:01.000 --> 00:00:02.000", "the quick",
      "00:00:02.000 --> 00:00:03.000", "the quick",
      "00:00:03.000 --> 00:00:04.000", "the quick brown",
    ].join("\n");
    expect(vttToText(vtt)).toBe("the quick\nthe quick brown");
  });

  it("handles comma decimal separators in timing lines", () => {
    expect(vttToText("WEBVTT\n\n00:00:01,000 --> 00:00:02,000\nHi\n")).toBe("Hi");
  });

  it("returns empty string for header-only input", () => {
    expect(vttToText("WEBVTT\n\n")).toBe("");
  });

  it("strips yt-dlp NOTE comment blocks between cues", () => {
    const vtt = [
      "WEBVTT", "",
      "1",
      "00:00:01.000 --> 00:00:03.000",
      "Hello world", "",
      "NOTE duration=\"00:00:10.000\"", "",
      "2",
      "00:00:11.000 --> 00:00:13.000",
      "Second line", "",
    ].join("\n");
    expect(vttToText(vtt)).toBe("Hello world\nSecond line");
  });

  it("strips bare NOTE keyword between cues", () => {
    const vtt = [
      "WEBVTT", "",
      "00:00:01.000 --> 00:00:02.000",
      "First", "",
      "NOTE", "",
      "00:00:03.000 --> 00:00:04.000",
      "Last", "",
    ].join("\n");
    expect(vttToText(vtt)).toBe("First\nLast");
  });

  it("preserves numeric cue text that follows a timing line (not a cue index)", () => {
    // "2024" after a timing line is cue text, not a cue sequence number.
    const vtt = [
      "WEBVTT", "",
      "00:00:01.000 --> 00:00:02.000",
      "2024", "",
      "00:00:02.000 --> 00:00:03.000",
      "42", "",
    ].join("\n");
    expect(vttToText(vtt)).toBe("2024\n42");
  });
});
