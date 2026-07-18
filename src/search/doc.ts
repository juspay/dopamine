import crypto from "node:crypto";

export interface ComposedDocInput {
  title: string;
  category: string;
  tags: string[];
  topics: string[];
  takeaways: string[];
  tools: { name: string; description: string }[];
  description: string;
  transcript: string;
}

export const COMPOSED_DOC_MAX_CHARS = 4000;

/**
 * Priority-ordered document for embedding + FTS. High-signal fields come first
 * so the truncation budget always sacrifices transcript tail, never takeaways.
 */
export function composeDoc(input: ComposedDocInput): string {
  const parts = [
    input.title,
    input.category,
    input.tags.join(", "),
    input.topics.join(", "),
    input.takeaways.join("\n"),
    input.tools.map((t) => (t.description ? `${t.name}: ${t.description}` : t.name)).join("\n"),
    input.description,
    input.transcript,
  ].filter((p) => p.trim() !== "");
  return parts.join("\n").slice(0, COMPOSED_DOC_MAX_CHARS);
}

export function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
