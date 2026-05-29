/**
 * DashboardAgent — step 11
 *
 * Replaced the monolithic HTML generator with a data builder that emits
 * static JSON to dashboard/data/ (consumed by the SvelteKit SPA).
 *
 * The export name and signature are unchanged so runner.ts and
 * `npm run dashboard` continue to work without modification.
 */

import { buildDashboardData } from "../dashboard/data-builder.js";

export async function runDashboardAgent(): Promise<void> {
  await buildDashboardData();
}
