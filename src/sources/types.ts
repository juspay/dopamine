// src/sources/types.ts
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";

export interface SourceCollector {
  readonly source: SourceKind;
  collect(): Promise<SourceItem[]>;
  /** Returns null to signal this item should be skipped entirely. */
  acquire(item: SourceItem): Promise<AcquiredAssets | null>;
}

/**
 * The source itself cannot be reached (a blocked network, a login wall). That is an
 * outage, not a property of the item: it must not count toward an item's failure limit.
 */
export class SourceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}
