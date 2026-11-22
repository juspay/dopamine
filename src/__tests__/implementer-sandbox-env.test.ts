// src/__tests__/implementer-sandbox-env.test.ts
//
// Setup commands run with HOME pointed at the item's sandbox, but that did not contain global
// installs: npm's global folder is Node's own prefix (/opt/homebrew), and PNPM_HOME and the
// like were inherited as absolute paths. Between 2026-11-15 and 2026-11-22 setup steps left
// 20 global npm packages and changed Homebrew formulas. Global installs now land in the sandbox.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { blockedReason, runCommand } from "../agents/implementer.js";

const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "impl-env-")));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const inside = (p: string): boolean => path.resolve(p.trim()).startsWith(dir + path.sep);

describe("the environment a setup command gets", () => {
  it.each([
    "NPM_CONFIG_PREFIX",
    "npm_config_prefix",
    "PNPM_HOME",
    "BUN_INSTALL",
    "CARGO_HOME",
    "GOPATH",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "XDG_STATE_HOME",
    "PYTHONUSERBASE",
    "GEM_HOME",
    "PIPX_HOME",
    "UV_TOOL_DIR",
  ])("points %s inside the sandbox", async (name) => {
    const r = await runCommand(`printf '%s' "$${name}"`, dir, 10_000);
    expect(r.stdout).not.toBe("");
    expect(inside(r.stdout)).toBe(true);
  });

  it("makes npm report the sandbox as its global folder", async () => {
    const r = await runCommand("npm config get prefix", dir, 30_000);
    expect(r.exit_code).toBe(0);
    expect(inside(r.stdout)).toBe(true);
  }, 40_000);

  it("installs a global npm package into the sandbox, not the machine", async () => {
    const pkg = path.join(dir, "tiny-pkg");
    fs.mkdirSync(path.join(pkg, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "dopamine-sandbox-probe",
        version: "1.0.0",
        bin: { "dopamine-sandbox-probe": "bin/x.js" },
      }),
    );
    fs.writeFileSync(path.join(pkg, "bin", "x.js"), "#!/usr/bin/env node\n");
    const r = await runCommand("npm install -g --offline --no-audit --no-fund ./tiny-pkg && npm root -g", dir, 60_000);
    expect(r.exit_code).toBe(0);
    const root = r.stdout.trim().split("\n").pop() ?? "";
    expect(inside(root)).toBe(true);
    expect(fs.existsSync(path.join(root, "dopamine-sandbox-probe"))).toBe(true);
  }, 70_000);

  it("can still find the machine's own tools", async () => {
    const r = await runCommand("command -v node && command -v npm", dir, 10_000);
    expect(r.exit_code).toBe(0);
  });
});

describe("system package managers", () => {
  it.each([
    "brew install tailscale",
    "brew upgrade",
    "brew install --cask vibetunnel",
    "brew tap someone/tools && brew install x",
    "port install foo",
    "apt-get install -y foo",
    "apt install foo",
    "snap install foo",
  ])("are refused: %s", (cmd) => {
    expect(blockedReason(cmd)).toMatch(/system package/i);
  });

  it.each(["brew --version", "brew list", "brew info ffmpeg", "npm install foo"])("may still be queried: %s", (cmd) => {
    expect(blockedReason(cmd)).toBeNull();
  });
});
