# Contributing to Dopamine

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint + Husky.

### Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Allowed Types

| Type | Description | Release |
|------|-------------|---------|
| `feat` | New feature or capability | minor |
| `fix` | Bug fix | patch |
| `docs` | Documentation changes | patch |
| `style` | Formatting, whitespace (no logic change) | patch |
| `refactor` | Code restructuring (no behavior change) | patch |
| `perf` | Performance improvement | patch |
| `test` | Adding or updating tests | -- |
| `build` | Build system or dependency changes | patch |
| `ci` | CI/CD configuration | -- |
| `chore` | Maintenance tasks | -- |
| `revert` | Revert a previous commit | -- |

### Breaking Changes

Add `BREAKING CHANGE:` in the commit footer or use `!` after the type:

```
feat!: replace Python pipeline with TypeScript NeuroLink agents

BREAKING CHANGE: Pipeline is now TypeScript-first. Python scripts moved to scripts/.
```

Breaking changes trigger a **major** version bump.

### Using Commitizen

For an interactive commit prompt:

```bash
npm run commit
```

This walks you through the type, scope, subject, body, and footer.

### Semantic Release

Releases are automated via `semantic-release` on the `main` and `release` branches. The release process:

1. Analyzes commits since the last release
2. Determines the version bump (major/minor/patch)
3. Updates `CHANGELOG.md`
4. Updates `package.json` version
5. Creates a git tag and GitHub release

To preview what would happen:

```bash
npm run release:dry
```

---

## How to Add a New Pipeline Step

### 1. Create the Agent

Create `src/agents/my-agent.ts`. Follow the existing agent pattern:

```typescript
import { type NeuroLink } from "@juspay/neurolink";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";

export async function runMyAgent(neurolink: NeuroLink): Promise<void> {
  console.log("\n=== MyAgent ===");

  // 1. Load input state from a previous step
  const input = await loadState<Record<string, SomeType>>(
    CONFIG.STATE.SOME_INPUT, {}
  );

  // 2. Load existing output state (for resume support)
  const output = await loadState<Record<string, OutputType>>(
    CONFIG.STATE.MY_OUTPUT, {}
  );

  let processed = 0, skipped = 0, errors = 0;

  for (const [filename, data] of Object.entries(input)) {
    // 3. Resume mode: skip already-processed items
    if (filename in output && !output[filename].error) {
      skipped++;
      continue;
    }

    // 4. Process the item
    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: { text: "your prompt" },
        provider: "vertex",
        model: CONFIG.MODEL,
        schema: YourZodSchema,
        output: { format: "json" },
        disableTools: true,    // Required for Gemini structured output
        maxTokens: 4096,
        timeout: "120s",
      });
      return YourZodSchema.parse(JSON.parse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      output[filename] = { filename, ...result.value };
      processed++;
    } else {
      output[filename] = { filename, error: result.error };
      errors++;
    }

    // 5. Save after every item (resume guarantee)
    await saveState(CONFIG.STATE.MY_OUTPUT, output);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`Done. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
}
```

**If your agent does NOT call Gemini** (pure data transform), you can skip the NeuroLink parameter:

```typescript
export async function runMyAgent(): Promise<void> {
  // Pure data transformation, no AI calls
}
```

### 2. Add a Zod Schema (if using Gemini)

Create `src/schemas/my-schema.ts`:

```typescript
import { z } from "zod";

export const MySchema = z.object({
  field1: z.string().describe("Description for the LLM"),
  field2: z.number().describe("Another field"),
  items: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })),
});

export type MyType = z.infer<typeof MySchema>;
```

**Important Gemini constraints:**
- Do NOT use `z.union()` -- causes "Too many states" error
- Prefer `z.string().describe(...)` over `z.enum()` inside nested arrays
- Keep structures as flat as possible

### 3. Add a State Path

In `src/pipeline/config.ts`, add an entry to the `STATE` object:

```typescript
STATE: {
  // ...existing entries
  MY_OUTPUT: path.resolve("videos", "my_output.json"),
},
```

### 4. Register in the Pipeline Runner

In `src/pipeline/runner.ts`:

```typescript
import { runMyAgent } from "../agents/my-agent.js";

// Add to the steps array at the desired position:
const steps = [
  // ...existing steps
  { name: "My new step", run: () => runMyAgent(neurolink) },
];
```

### 5. Build and Test

```bash
# Compile
npm run build

# Run just your step (adjust the step number)
START_STEP=16 END_STEP=17 npm run pipeline

# Or test with the test harness
node dist/pipeline/test-verification.js
```

---

## How to Add a New Agent (Non-Pipeline)

If you need a standalone agent that is not part of the pipeline (e.g., a one-off data migration), create it in `src/agents/` and add a script entry in `package.json`:

```json
{
  "scripts": {
    "my-task": "node dist/agents/my-agent.js"
  }
}
```

Make sure the file has a direct-execution guard:

```typescript
if (process.argv[1]?.endsWith("my-agent.js")) {
  runMyAgent().catch(err => {
    console.error("Failed:", err);
    process.exit(1);
  });
}
```

---

## Testing

### Build Verification

The project uses TypeScript strict mode. The pre-commit hook runs `npm run build` automatically, so your code must compile cleanly before you can commit.

```bash
npm run build
```

### Running a Single Pipeline Step

Use `START_STEP` and `END_STEP` environment variables to isolate a step:

```bash
# Run only step 5 (Knowledge extraction, 0-indexed = 4)
START_STEP=4 END_STEP=5 npm run pipeline
```

### Verification Pipeline Test Harness

A dedicated test runner exists for Steps 12-16 that operates on a single video:

```bash
# Test with the default video
node dist/pipeline/test-verification.js

# Test with a specific video
node dist/pipeline/test-verification.js "username_1234567890.mp4"
```

This harness:
- Backs up all state files before the test
- Isolates the knowledge base to the single target video
- Runs Steps 12-16 sequentially
- Prints detailed results for each step
- Restores all state files after the test

### Unit Testing (Vitest)

The project includes vitest as a dev dependency. Test files go in `src/**/*.test.ts`:

```bash
npx vitest         # Run tests
npx vitest --ui    # Interactive UI
npx vitest --coverage  # Coverage report
```

### Manual Verification Checklist

Before submitting a PR:

1. `npm run build` passes with no errors
2. The pipeline runs end-to-end (or at least the steps you changed)
3. State files (`videos/*.json`) are valid JSON after a run
4. The dashboard (`npm run serve`) renders correctly
5. Commit messages follow the conventional format

---

## Project Structure at a Glance

```
src/
  agents/           One file per pipeline step (16 agents)
  pipeline/
    runner.ts       Step orchestrator
    config.ts       All paths, model config, rate limits
    state.ts        loadState() / saveState() helpers
    test-verification.ts   Single-video test harness for Steps 12-16
  schemas/          Zod schemas for Gemini structured output
  server/           Express webhook + dashboard servers
  types/            Shared TypeScript interfaces
  utils/            Rate limiting, video file helpers
scripts/            Python scripts (metadata + download via instagrapi)
dashboard/          Generated HTML dashboard
knowledge_base/     Generated markdown knowledge base
videos/             Downloaded videos + all JSON state
```
