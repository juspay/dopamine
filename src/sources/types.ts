// src/sources/types.ts
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";

export interface SourceCollector {
  readonly source: SourceKind;
  collect(): Promise<SourceItem[]>;
  /** Returns null to signal this item should be skipped entirely. */
  acquire(item: SourceItem): Promise<AcquiredAssets | null>;
}
