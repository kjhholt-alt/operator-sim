#!/usr/bin/env node
/*
 * Watchfloor — Shift YAML validator.
 *
 * Standalone shape checker. Full Zod validation happens at runtime in the app
 * (src/lib/schemas.ts). This script is the CI sanity gate — duplicates the
 * minimum schema rules to keep CI fast and dependency-light.
 *
 * Run by /dispatchaudit and .github/workflows/dispatchaudit.yml.
 * Exits 0 if all valid, 1 if any invalid.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const shiftsDir = resolve(repoRoot, "data", "shifts");
const addressesPath = resolve(repoRoot, "public", "data", "quad_cities", "addresses.json");

if (!existsSync(shiftsDir)) {
  console.log(`[validate-shifts] no shifts dir at ${shiftsDir} — nothing to validate`);
  process.exit(0);
}

// Lightweight YAML parser inline (avoid extra dep for Day 0; replace with `yaml` package when shifts ship)
async function loadYaml(path) {
  // Defer to npm `yaml` if installed, else error gracefully
  try {
    const yaml = await import("yaml");
    return yaml.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(
      `npm package "yaml" not installed. Run: npm i -D yaml. ` +
        `(Day 0 doesn't ship shifts yet — this validator becomes hot when Designer agent commits the first shift.)`,
    );
  }
}

const addressLookup = existsSync(addressesPath)
  ? new Set(JSON.parse(readFileSync(addressesPath, "utf8")).map((a) => a.street.toLowerCase()))
  : null;

if (!addressLookup) {
  console.log(`[validate-shifts] address bake not yet present at ${addressesPath} — running structural check only`);
}

const files = readdirSync(shiftsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
if (files.length === 0) {
  console.log(`[validate-shifts] no shift files in ${shiftsDir}`);
  process.exit(0);
}

const errors = [];
const seenIds = new Set();

const REQ_TOP = ["id", "date", "difficulty_tier", "incidents"];
const REQ_INCIDENT = [
  "id",
  "spawn_time_game_min",
  "type",
  "address",
  "resolution_window_game_min",
];

for (const file of files) {
  const path = resolve(shiftsDir, file);
  let shift;
  try {
    shift = await loadYaml(path);
  } catch (err) {
    errors.push(`${file}: YAML parse error: ${err.message}`);
    continue;
  }

  for (const k of REQ_TOP) {
    if (shift[k] === undefined) errors.push(`${file}: missing top-level "${k}"`);
  }

  if (shift.id) {
    if (seenIds.has(shift.id)) errors.push(`${file}: duplicate shift.id "${shift.id}"`);
    seenIds.add(shift.id);
  }

  if (
    typeof shift.difficulty_tier === "number" &&
    (shift.difficulty_tier < 1 || shift.difficulty_tier > 5)
  ) {
    errors.push(`${file}: difficulty_tier must be 1-5, got ${shift.difficulty_tier}`);
  }

  if (Array.isArray(shift.incidents)) {
    const incidentIds = new Set();
    let totalRes = 0;
    for (const incident of shift.incidents) {
      for (const k of REQ_INCIDENT) {
        if (incident[k] === undefined)
          errors.push(`${file}: incident "${incident.id ?? "?"}" missing "${k}"`);
      }
      if (incident.id) {
        if (incidentIds.has(incident.id))
          errors.push(`${file}: duplicate incident.id "${incident.id}" within shift`);
        incidentIds.add(incident.id);
      }
      if (typeof incident.resolution_window_game_min === "number") {
        totalRes += incident.resolution_window_game_min;
      }
      if (addressLookup && incident.address) {
        const street = String(incident.address).split(",")[0].trim().toLowerCase();
        if (!addressLookup.has(street)) {
          errors.push(`${file}: incident "${incident.id}" address "${incident.address}" not in baked address list`);
        }
      }
    }
    const len = shift.length_game_min ?? 12;
    if (totalRes > len * 1.5) {
      errors.push(
        `${file}: incidents total resolution_window=${totalRes.toFixed(1)} game-min vs shift length ${len} — too dense for relaxed pacing`,
      );
    }

    // Thread integrity
    if (Array.isArray(shift.narrative_threads)) {
      for (const thread of shift.narrative_threads) {
        for (const iid of thread.incident_ids ?? []) {
          if (!incidentIds.has(iid)) {
            errors.push(`${file}: thread "${thread.id}" references missing incident "${iid}"`);
          }
        }
      }
    }
  } else {
    errors.push(`${file}: incidents must be a non-empty array`);
  }
}

if (errors.length === 0) {
  console.log(`[validate-shifts] ✓ ${files.length} shift(s) valid`);
  process.exit(0);
}

console.error(`[validate-shifts] ✗ ${errors.length} error(s):`);
for (const e of errors) console.error("  - " + e);
process.exit(1);
