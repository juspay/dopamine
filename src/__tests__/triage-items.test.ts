// src/__tests__/triage-items.test.ts
import { describe, expect, it } from "vitest";
import type { ClassificationEntry } from "../agents/classifier.js";
import { type TriageInput, captionsForNonInstagram, runTriage } from "../agents/triage.js";
import type { SourceItem } from "../types/index.js";

const item = (id: string, over: Partial<SourceItem> = {}): SourceItem => ({
  id,
  source: "youtube",
  content_type: "long_video",
  title: "A title",
  author: "Channel",
  caption_text: null,
  url: null,
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
  ...over,
});

const cls = (over: Partial<ClassificationEntry> = {}): ClassificationEntry =>
  ({
    category: "Tech & Coding",
    subcategory: "",
    tags: ["x"],
    description: "d",
    pk: null,
    code: null,
    username: null,
    ...over,
  }) as ClassificationEntry;

const verdict = { tier: "reference-only", confidence: "low", reason: "" };

describe("runTriage with non-instagram items", () => {
  it("reads a youtube item's caption through captionById", async () => {
    const seen: TriageInput[] = [];
    const generate = async (_prompt: string, input: TriageInput) => {
      seen.push(input);
      return verdict;
    };
    await runTriage({
      classifications: { youtube_abc: cls() },
      captionByPk: new Map(),
      captionById: new Map([["youtube_abc", "words from the transcript"]]),
      prior: {},
      model: "m",
      generate,
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].caption).toBe("words from the transcript");
  });

  it("prefers the caption found by pk, so instagram triage input is unchanged", async () => {
    const seen: TriageInput[] = [];
    const generate = async (_prompt: string, input: TriageInput) => {
      seen.push(input);
      return verdict;
    };
    await runTriage({
      classifications: { "u_1.mp4": cls({ pk: "1" }) },
      captionByPk: new Map([["1", "instagram caption"]]),
      captionById: new Map([["u_1.mp4", "something else"]]),
      prior: {},
      model: "m",
      generate,
    });
    expect(seen[0].caption).toBe("instagram caption");
  });
});

describe("captionsForNonInstagram", () => {
  it("uses caption_text, then title, and leaves instagram items out", () => {
    const index = new Map<string, SourceItem>([
      ["youtube_a", item("youtube_a", { caption_text: "the description" })],
      ["youtube_b", item("youtube_b", { title: "only a title" })],
      ["youtube_c", item("youtube_c", { title: null })],
      ["u_1.mp4", item("u_1.mp4", { source: "instagram", caption_text: "ig caption" })],
    ]);
    const captions = captionsForNonInstagram(index);
    expect(captions.get("youtube_a")).toBe("the description");
    expect(captions.get("youtube_b")).toBe("only a title");
    expect(captions.get("youtube_c")).toBe("");
    expect(captions.has("u_1.mp4")).toBe(false);
  });
});
