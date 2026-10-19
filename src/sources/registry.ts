// src/sources/registry.ts
import { makeInstagramCollector } from "./instagram/collector.js";
import { makeYoutubeCollector } from "./youtube/collector.js";
import type { SourceCollector } from "./types.js";
import type { SourceKind } from "../types/index.js";

export const SOURCE_FACTORIES: Record<SourceKind, () => SourceCollector> = {
  instagram: makeInstagramCollector,
  youtube: makeYoutubeCollector,
};

/** Parse the comma-separated SOURCES string → one collector per unique known token.
 *  Unknown tokens are skipped with a warning. Default (undefined) → ["instagram"]. */
export function getEnabledCollectors(sourcesEnv: string | undefined): SourceCollector[] {
  const raw = sourcesEnv?.trim() || "instagram";
  const seen = new Set<SourceKind>();
  const collectors: SourceCollector[] = [];
  for (const token of raw.split(",")) {
    const name = token.trim();
    if (name === "") continue;
    if (!(name in SOURCE_FACTORIES)) {
      console.warn(
        `[registry] Unknown source "${name}" — ignoring. Valid: ${Object.keys(SOURCE_FACTORIES).join(", ")}`,
      );
      continue;
    }
    const kind = name as SourceKind;
    if (seen.has(kind)) continue;
    seen.add(kind);
    collectors.push(SOURCE_FACTORIES[kind]());
  }
  return collectors;
}
