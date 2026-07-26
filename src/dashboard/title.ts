// Matches a leading "[0:00]", "[00:00:00]", or "[00:00 - 00:11]" timestamp tag.
// Belt-and-suspenders: callers should pass plain text (see takeawayTitleText),
// but a source can still carry an inline timestamp (e.g. the LLM writing one
// into the takeaway text itself) — a title must never surface one regardless
// of where it came from.
const LEADING_TIMESTAMP = /^\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*-\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*\]\s*/;

/** Strip a leading timestamp tag and trim; empty result if nothing else remains.
 *  Trims FIRST: the pattern is anchored, so leading whitespace or a newline
 *  before the tag would otherwise defeat it and leak the raw tag into the title.
 *  Repeats, since a source can carry more than one stacked tag. */
function clean(source: string | undefined): string {
  let out = (source ?? "").trim();
  let prev: string;
  do {
    prev = out;
    out = out.replace(LEADING_TIMESTAMP, "").trim();
  } while (out !== prev);
  return out;
}

/**
 * Title = catalog.description || first key_takeaway || classification.description || "(untitled)".
 * Shared by the dashboard data-builder and the search indexer so both derive
 * identical titles for the same video. Each source is timestamp-stripped and
 * a source left empty after stripping falls through to the next one.
 */
export function deriveTitle(
  catalogDescription: string | undefined,
  firstTakeaway: string,
  classificationDescription: string | undefined,
): string {
  return clean(catalogDescription) || clean(firstTakeaway) || clean(classificationDescription) || "(untitled)";
}
