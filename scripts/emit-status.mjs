#!/usr/bin/env node
/*
 * Watchfloor — Studio-OS health emitter.
 * Run by Studio-OS daemon every tick to surface project liveness on the dashboard.
 * Outputs JSON to stdout following the Studio-OS health contract.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function safe(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

function gitInfo() {
  return {
    branch: safe(() => execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot }).toString().trim()),
    commit: safe(() => execSync("git rev-parse --short HEAD", { cwd: repoRoot }).toString().trim()),
    dirty: safe(() => execSync("git status --porcelain", { cwd: repoRoot }).toString().trim().length > 0),
    ahead_master: safe(() => parseInt(execSync("git rev-list --count master..HEAD 2>/dev/null || echo 0", { cwd: repoRoot }).toString().trim(), 10)),
  };
}

function pkgInfo() {
  const pkgPath = resolve(repoRoot, "package.json");
  if (!existsSync(pkgPath)) return {};
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  return { name: pkg.name, version: pkg.version };
}

function lastBuild() {
  const distPath = resolve(repoRoot, "dist");
  if (!existsSync(distPath)) return null;
  return statSync(distPath).mtime.toISOString();
}

function statusFile() {
  const p = resolve(repoRoot, "STATUS.md");
  if (!existsSync(p)) return null;
  const text = readFileSync(p, "utf8");
  const phaseMatch = text.match(/\*\*Phase:\*\*\s*(.+)/);
  const blockersMatch = text.match(/\*\*Blockers:\*\*\s*(.+)/);
  return {
    phase: phaseMatch?.[1]?.trim() ?? null,
    blockers: blockersMatch?.[1]?.trim() ?? null,
  };
}

const out = {
  project: "watchfloor",
  ts: new Date().toISOString(),
  health: "green",
  ...pkgInfo(),
  git: gitInfo(),
  last_build: lastBuild(),
  status: statusFile(),
};

if (out.git.dirty) out.health = "amber";
if (out.status?.blockers && out.status.blockers !== "none") out.health = "amber";

process.stdout.write(JSON.stringify(out, null, 2) + "\n");
