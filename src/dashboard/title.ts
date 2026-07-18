/**
 * Title = catalog.description || first key_takeaway || classification.description || "(untitled)".
 * Shared by the dashboard data-builder and the search indexer so both derive
 * identical titles for the same video.
 */
export function deriveTitle(
  catalogDescription: string | undefined,
  firstTakeaway: string,
  classificationDescription: string | undefined,
): string {
  return catalogDescription || firstTakeaway || classificationDescription || "(untitled)";
}
