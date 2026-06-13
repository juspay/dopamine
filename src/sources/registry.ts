// src/sources/registry.ts
import { makeInstagramCollector } from "./instagram/collector.js";
import { makeYoutubeCollector } from "./youtube/collector.js";
import type { SourceCollector } from "./types.js";
import type { SourceKind } from "../types/index.js";

const FACTORY_MAP: Record<SourceKind, () => SourceCollector> = {
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
    if (!(name in FACTORY_MAP)) {
      console.warn(`[registry] Unknown source "${name}" — ignoring. Valid: ${Object.keys(FACTORY_MAP).join(", ")}`);
      continue;
    }
    const kind = name as SourceKind;
    if (seen.has(kind)) continue;
    seen.add(kind);
    collectors.push(FACTORY_MAP[kind]());
  }
  return collectors;
}
