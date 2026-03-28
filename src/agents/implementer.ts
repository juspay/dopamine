/**
 * ImplementerAgent — Step 14
 *
 * For each actionable item marked as implementable:
 * - Creates a sandboxed directory: sandbox/{video_filename}/{item_name}/
 * - Runs install commands (npm install, pip install, etc.) in the sandbox
 * - Writes any code files
 * - Runs verification commands
 * - Captures stdout/stderr and exit codes
 * - Records: success/failure, output, time taken
 *
 * Uses execa for running commands in sandbox dirs.
 * State: videos/implementations.json
 */

import { execa } from "execa";
import path from "node:path";
import fs from "node:fs/promises";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import type { AnalysisEntry } from "./analyzer.js";
import type { ResearchEntry } from "./researcher.js";

const SANDBOX_ROOT = path.resolve("sandbox");

/** Configurable command timeout — override via COMMAND_TIMEOUT_MS env var (default 30s). */
const COMMAND_TIMEOUT_MS = parseInt(process.env.COMMAND_TIMEOUT_MS ?? "30000", 10);

/** Auto-cleanup sandbox dirs older than this many days (default 7). Override via SANDBOX_MAX_AGE_DAYS. */
const SANDBOX_MAX_AGE_DAYS = parseInt(process.env.SANDBOX_MAX_AGE_DAYS ?? "7", 10);

/** Result for a single implementation attempt. */
export interface ImplementationItemResult {
  item_name: string;
  item_type: string;
  sandbox_path: string;
  install_result: CommandResult | null;
  code_written: boolean;
  code_file: string;
  verification_results: CommandResult[];
  overall_status: "success" | "partial_success" | "failed" | "skipped";
  time_ms: number;
  error?: string;
}

/** Result of running a command. */
interface CommandResult {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  timed_out: boolean;
}

/** Implementation state for a single video. */
export interface ImplementationEntry {
  filename: string;
  items: ImplementationItemResult[];
  implemented_at: string;
  error?: string;
}

/**
 * Sanitize a name to be a valid directory name.
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

/**
 * Kill a process tree (the process and all its children) to avoid zombies.
 */
async function killProcessTree(pid: number): Promise<void> {
  try {
    // Kill the entire process group
    process.kill(-pid, "SIGKILL");
  } catch {
    // Process group kill may fail; try killing just the process
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already dead — ignore
    }
  }
}

/**
 * Run a command in a sandbox directory with timeout.
 * On timeout, kills the process tree to prevent zombie processes.
 */
async function runCommand(command: string, cwd: string): Promise<CommandResult> {
  // Security: skip dangerous commands
  const dangerous = [
    "rm -rf /", "rm -rf /*", "sudo", "mkfs", "dd if=", "> /dev/",
    "chmod -R 777", "curl|sh", "curl|bash", "wget|sh", "wget|bash",
    "eval(", "exec(", "/__", "../", "~/"
  ];
  if (dangerous.some(d => command.includes(d))) {
    return {
      command,
      exit_code: 1,
      stdout: "",
      stderr: "Command blocked for safety",
      timed_out: false,
    };
  }

  try {
    const proc = execa("sh", ["-c", command], {
      cwd,
      timeout: COMMAND_TIMEOUT_MS,
      reject: false,
      detached: true, // Create a process group so we can kill the tree
      env: {
        ...process.env,
        HOME: cwd, // Isolate npm/pip to sandbox
        NODE_ENV: "development",
      },
    });

    const result = await proc;

    return {
      command,
      exit_code: result.exitCode ?? 1,
      stdout: (result.stdout ?? "").slice(0, 5000), // Cap output
      stderr: (result.stderr ?? "").slice(0, 5000),
      timed_out: false,
    };
  } catch (err) {
    const msg = String(err);
    const timedOut = msg.includes("timed out") || msg.includes("ETIMEDOUT") || msg.includes("SIGTERM");

    // Kill zombie processes after timeout
    if (timedOut) {
      // execa attaches the pid to the error object in some cases
      const errObj = err as { pid?: number };
      if (errObj.pid) {
        await killProcessTree(errObj.pid);
      }
    }

    return {
      command,
      exit_code: 1,
      stdout: "",
      stderr: timedOut ? `Command timed out after ${COMMAND_TIMEOUT_MS}ms` : msg.slice(0, 2000),
      timed_out: timedOut,
    };
  }
}

/**
 * Clean up a partially-installed sandbox directory.
 * Removes node_modules, __pycache__, and other install artifacts.
 */
async function cleanupPartialInstall(itemDir: string): Promise<void> {
  const dirsToRemove = ["node_modules", "__pycache__", ".pip", "venv", ".venv"];
  for (const dir of dirsToRemove) {
    const target = path.join(itemDir, dir);
    try {
      await fs.rm(target, { recursive: true, force: true });
    } catch {
      // Ignore — directory may not exist
    }
  }
  // Also remove package-lock.json if it was a failed npm install
  try {
    await fs.rm(path.join(itemDir, "package-lock.json"), { force: true });
  } catch {
    // Ignore
  }
}

/**
 * Attempt to clear package manager caches when an install fails.
 * This can resolve corrupted-cache issues on retry.
 */
async function clearPackageCache(command: string, cwd: string): Promise<void> {
  if (command.includes("npm") || command.includes("npx")) {
    console.log("    Clearing npm cache after install failure...");
    await runCommand("npm cache clean --force 2>/dev/null", cwd);
  }
  if (command.includes("pip")) {
    console.log("    Clearing pip cache after install failure...");
    await runCommand("pip cache purge 2>/dev/null", cwd);
  }
}

/**
 * Determine the code file extension based on the install command or code content.
 */
function getCodeExtension(installCmd: string, code: string): string {
  if (installCmd.includes("pip") || code.includes("import ") || code.includes("def ")) return ".py";
  if (installCmd.includes("npm") || installCmd.includes("npx") || code.includes("require(") || code.includes("import ")) return ".js";
  if (installCmd.includes("cargo")) return ".rs";
  if (installCmd.includes("go ")) return ".go";
  if (code.includes("#!/bin/bash") || code.includes("#!/bin/sh")) return ".sh";
  return ".js"; // Default to JS
}

/**
 * Implement a single actionable item.
 */
async function implementItem(
  item: { name: string; type: string; install_command: string; code: string; url: string; verification_steps: string[] },
  sandboxDir: string,
): Promise<ImplementationItemResult> {
  const t0 = Date.now();
  const itemDir = path.join(sandboxDir, sanitizeName(item.name));
  await fs.mkdir(itemDir, { recursive: true });

  const result: ImplementationItemResult = {
    item_name: item.name,
    item_type: item.type,
    sandbox_path: itemDir,
    install_result: null,
    code_written: false,
    code_file: "",
    verification_results: [],
    overall_status: "skipped",
    time_ms: 0,
  };

  // Skip items that are purely conceptual (workflows/techniques without commands)
  if (
    item.type === "technique" &&
    !item.install_command &&
    !item.code
  ) {
    result.overall_status = "skipped";
    result.time_ms = Date.now() - t0;
    return result;
  }

  let installSuccess = true;

  // 1. Run install command if present
  if (item.install_command && item.install_command.trim()) {
    const cmd = item.install_command.trim();

    // Initialize package.json if npm is involved
    if (cmd.includes("npm")) {
      await runCommand("npm init -y 2>/dev/null", itemDir);
    }

    console.log(`    Running: ${cmd}`);
    const installResult = await runCommand(cmd, itemDir);
    result.install_result = installResult;
    installSuccess = installResult.exit_code === 0;

    if (!installSuccess) {
      console.log(`    Install failed (exit ${installResult.exit_code})`);
      // Clear package manager cache and clean up partial artifacts
      await clearPackageCache(cmd, itemDir);
      await cleanupPartialInstall(itemDir);
    }
  }

  // 2. Write code file if present
  if (item.code && item.code.trim()) {
    const ext = getCodeExtension(item.install_command || "", item.code);
    const codeFile = path.join(itemDir, `test_code${ext}`);
    await fs.writeFile(codeFile, item.code, "utf8");
    result.code_written = true;
    result.code_file = codeFile;
  }

  // 3. Run verification steps
  if (item.verification_steps && item.verification_steps.length > 0) {
    for (const step of item.verification_steps) {
      // Only run steps that look like commands (skip prose descriptions)
      if (isLikelyCommand(step)) {
        console.log(`    Verifying: ${step.slice(0, 80)}`);
        const vResult = await runCommand(step, itemDir);
        result.verification_results.push(vResult);
      }
    }
  }

  // 4. Determine overall status
  const hasInstall = result.install_result !== null;
  const hasVerification = result.verification_results.length > 0;

  if (hasInstall && hasVerification) {
    const installOk = result.install_result!.exit_code === 0;
    const verifyOk = result.verification_results.some(v => v.exit_code === 0);
    if (installOk && verifyOk) result.overall_status = "success";
    else if (installOk || verifyOk) result.overall_status = "partial_success";
    else result.overall_status = "failed";
  } else if (hasInstall) {
    result.overall_status = result.install_result!.exit_code === 0 ? "success" : "failed";
  } else if (result.code_written) {
    result.overall_status = "partial_success"; // Code written but not verified
  } else {
    result.overall_status = "skipped";
  }

  result.time_ms = Date.now() - t0;
  return result;
}

/**
 * Check if a string looks like a shell command vs. a prose description.
 */
function isLikelyCommand(step: string): boolean {
  const cmdPatterns = [
    /^(npm|npx|node|python|pip|cargo|go |brew |curl |wget |which |ls |cat |echo |test )/,
    /^[a-z_]+\s+(-|--)/,  // command with flags
    /\.(js|py|sh|ts)\b/,  // file extensions
    /--version/,
    /^(cd |mkdir |touch )/,
  ];
  const trimmed = step.trim().toLowerCase();
  return cmdPatterns.some(p => p.test(trimmed)) && trimmed.length < 200;
}

/**
 * Auto-cleanup old sandbox directories to save disk space.
 * Removes sandbox sub-dirs whose mtime is older than SANDBOX_MAX_AGE_DAYS.
 */
async function cleanupOldSandboxDirs(): Promise<void> {
  try {
    const entries = await fs.readdir(SANDBOX_ROOT, { withFileTypes: true });
    const cutoff = Date.now() - SANDBOX_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;
    let freedBytes = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(SANDBOX_ROOT, entry.name);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.mtimeMs < cutoff) {
          // Estimate size before removal
          freedBytes += await estimateDirSize(dirPath);
          await fs.rm(dirPath, { recursive: true, force: true });
          removed++;
        }
      } catch {
        // Skip dirs we can't stat
      }
    }

    if (removed > 0) {
      console.log(`  Sandbox cleanup: removed ${removed} dirs older than ${SANDBOX_MAX_AGE_DAYS} days (~${(freedBytes / 1024 / 1024).toFixed(1)}MB freed)`);
    } else {
      console.log(`  Sandbox cleanup: no dirs older than ${SANDBOX_MAX_AGE_DAYS} days`);
    }
  } catch {
    // Sandbox root doesn't exist yet — nothing to clean
  }
}

/**
 * Estimate total size of a directory tree (best-effort, not recursive on errors).
 */
async function estimateDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dirPath, entry.name);
      try {
        if (entry.isFile()) {
          const s = await fs.stat(p);
          total += s.size;
        } else if (entry.isDirectory()) {
          total += await estimateDirSize(p);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return total;
}

export async function runImplementerAgent(): Promise<void> {
  console.log("\n=== ImplementerAgent (Step 14) ===");

  // Auto-cleanup old sandbox directories before creating new ones
  await cleanupOldSandboxDirs();

  // Load analysis and research states
  const analysisState = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS, {}
  );
  const researchState = await loadState<Record<string, ResearchEntry>>(
    CONFIG.STATE.RESEARCH, {}
  );

  // Load existing implementation state (resume mode)
  const implState = await loadState<Record<string, ImplementationEntry>>(
    CONFIG.STATE.IMPLEMENTATIONS, {}
  );

  // Create sandbox root
  await fs.mkdir(SANDBOX_ROOT, { recursive: true });

  const entries = Object.entries(analysisState).filter(
    ([, entry]) => !entry.error && entry.actionable_items.length > 0
  );

  console.log(`Implementation: ${entries.length} videos with actionable items`);
  console.log(`Sandbox root: ${SANDBOX_ROOT}`);

  let implemented = 0, skipped = 0, errors = 0;

  for (const [i, [filename, analysis]] of entries.entries()) {
    const logPrefix = `[${i + 1}/${entries.length}]`;

    // Resume mode
    if (filename in implState && !implState[filename].error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already implemented): ${filename}`);
      continue;
    }

    console.log(`${logPrefix} Implementing: ${filename}`);

    const videoStem = filename.replace(/\.mp4$/i, "");
    const sandboxDir = path.join(SANDBOX_ROOT, sanitizeName(videoStem));
    await fs.mkdir(sandboxDir, { recursive: true });

    try {
      const itemResults: ImplementationItemResult[] = [];

      for (const [j, item] of analysis.actionable_items.entries()) {
        console.log(`  [${j + 1}/${analysis.actionable_items.length}] ${item.name} (${item.type})`);

        // Check research for URL status — skip if URL is dead
        const research = researchState[filename];
        const researchItem = research?.items.find(r => r.item_name === item.name);
        if (researchItem?.url_status === "dead") {
          console.log(`    SKIP: URL is dead`);
          itemResults.push({
            item_name: item.name,
            item_type: item.type,
            sandbox_path: "",
            install_result: null,
            code_written: false,
            code_file: "",
            verification_results: [],
            overall_status: "skipped",
            time_ms: 0,
            error: "URL confirmed dead by research",
          });
          continue;
        }

        const itemResult = await implementItem(item, sandboxDir);
        itemResults.push(itemResult);
        console.log(`    Status: ${itemResult.overall_status} (${itemResult.time_ms}ms)`);
      }

      implState[filename] = {
        filename,
        items: itemResults,
        implemented_at: new Date().toISOString(),
      };
      implemented++;

      const successCount = itemResults.filter(r => r.overall_status === "success").length;
      const failedCount = itemResults.filter(r => r.overall_status === "failed").length;
      console.log(`  -> ${successCount} succeeded, ${failedCount} failed, ${itemResults.length - successCount - failedCount} skipped/partial`);
    } catch (err) {
      implState[filename] = {
        filename,
        items: [],
        implemented_at: new Date().toISOString(),
        error: String(err),
      };
      errors++;
      console.error(`  -> ERROR: ${String(err).slice(0, 200)}`);
    }

    // Write after every video — resume mode guarantee
    await saveState(CONFIG.STATE.IMPLEMENTATIONS, implState);
  }

  console.log(`\nImplementation done. Implemented: ${implemented}, Skipped: ${skipped}, Errors: ${errors}`);
}
