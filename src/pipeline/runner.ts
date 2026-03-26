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
// Steps 12-16: Verification pipeline
import { runAnalyzerAgent }     from "../agents/analyzer.js";
import { runResearchAgent }     from "../agents/researcher.js";
import { runImplementerAgent }  from "../agents/implementer.js";
import { runVerifierAgent }     from "../agents/verifier.js";
import { runEnrichmentAgent }   from "../agents/enrichment.js";

export async function runFullPipeline(options: { startStep?: number; endStep?: number } = {}): Promise<void> {
  const neurolink = new NeuroLink();

  const steps = [
    { name: "Metadata collection",       run: () => runMetadataAgent() },             // 1
    { name: "Video download",            run: () => runDownloadAgent() },              // 2
    { name: "Properties extraction",     run: () => runPropertiesAgent() },            // 3
    { name: "Classification",            run: () => runClassifierAgent(neurolink) },   // 4
    { name: "Knowledge extraction",      run: () => runKnowledgeAgent(neurolink) },    // 5
    { name: "Link extraction",           run: () => runLinkExtractAgent(neurolink) },  // 6
    { name: "Link resolution",           run: () => runLinkResolverAgent(neurolink) }, // 7
    { name: "Catalog generation",        run: () => runCatalogAgent() },               // 8
    { name: "Folder organization",       run: () => runOrganizerAgent() },             // 9
    { name: "Markdown generation",       run: () => runMarkdownAgent() },              // 10
    { name: "Dashboard build",           run: () => runDashboardAgent() },             // 11
    // Verification pipeline (Steps 12-16)
    { name: "Content analysis",          run: () => runAnalyzerAgent(neurolink) },     // 12
    { name: "Research & verification",   run: () => runResearchAgent(neurolink) },     // 13
    { name: "Implementation testing",    run: () => runImplementerAgent() },           // 14
    { name: "Verification synthesis",    run: () => runVerifierAgent(neurolink) },     // 15
    { name: "Knowledge base enrichment", run: () => runEnrichmentAgent() },            // 16
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
