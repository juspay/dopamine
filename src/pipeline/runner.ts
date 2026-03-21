import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";
import { runMetadataAgent }     from "../agents/metadata.js";
import { runDownloadAgent }     from "../agents/download.js";
import { runPropertiesAgent }   from "../agents/properties.js";
import { runClassifierAgent }   from "../agents/classifier.js";
import { runKnowledgeAgent }    from "../agents/knowledge.js";
import { runLinkExtractAgent }  from "../agents/link-extractor.js";
import { runLinkResolverAgent } from "../agents/link-resolver.js";
import { runCatalogAgent }      from "../agents/catalog.js";
import { runOrganizerAgent }    from "../agents/organizer.js";
import { runMarkdownAgent }     from "../agents/markdown.js";
import { runDashboardAgent }    from "../agents/dashboard.js";

export async function runFullPipeline(options: { startStep?: number; endStep?: number } = {}): Promise<void> {
  const neurolink = new NeuroLink();

  const steps = [
    { name: "Metadata collection",   run: () => runMetadataAgent() },
    { name: "Video download",        run: () => runDownloadAgent() },
    { name: "Properties extraction", run: () => runPropertiesAgent() },
    { name: "Classification",        run: () => runClassifierAgent(neurolink) },
    { name: "Knowledge extraction",  run: () => runKnowledgeAgent(neurolink) },
    { name: "Link extraction",       run: () => runLinkExtractAgent(neurolink) },
    { name: "Link resolution",       run: () => runLinkResolverAgent(neurolink) },
    { name: "Catalog generation",    run: () => runCatalogAgent() },
    { name: "Folder organization",   run: () => runOrganizerAgent() },
    { name: "Markdown generation",   run: () => runMarkdownAgent() },
    { name: "Dashboard build",       run: () => runDashboardAgent() },
  ];

  const startStep = options.startStep ?? parseInt(process.env.START_STEP ?? "0", 10);
  const endStep   = options.endStep   ?? parseInt(process.env.END_STEP   ?? String(steps.length), 10);

  try {
    for (const [i, step] of steps.entries()) {
      if (i < startStep || i >= endStep) continue;
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Step ${i + 1}/${steps.length}: ${step.name}`);
      console.log("=".repeat(60));
      const t0 = Date.now();
      await step.run();
      console.log(`  Completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    console.log("\nPipeline complete.");
  } finally {
    await neurolink.shutdown();
  }
}

// Direct execution: node dist/pipeline/runner.js
if (process.argv[1]?.endsWith("runner.js")) {
  runFullPipeline().catch(err => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
