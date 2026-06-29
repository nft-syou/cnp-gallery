#!/usr/bin/env node
// Build + deploy to Cloudflare Workers WITHOUT committing the real D1 database_id.
//
// The tracked `wrangler.toml` ships a placeholder (`__D1_DATABASE_ID__`). This
// script copies it to a gitignored `wrangler.generated.toml`, substitutes the
// real id from the environment, then runs the OpenNext build + deploy pointed at
// that generated config (`opennextjs-cloudflare ... --config wrangler.generated.toml`).
// The generated file is removed afterwards so the real id never lands on disk
// long-term and never enters git.
//
// opennextjs-cloudflare@1.20 `deploy --config <path>` forwards the config to BOTH
// the `wrangler deploy` (worker upload) and the R2 incremental-cache population,
// so a single `deploy` command covers everything — no raw `wrangler deploy`.
//
// Required env (either name works; checked in this order):
//   CLOUDFLARE_D1_DATABASE_ID  (preferred for local deploys)
//   D1_DATABASE_ID             (maps to the GitHub Actions repo variable)
//
// Usage:
//   CLOUDFLARE_D1_DATABASE_ID=<real-id> node scripts/deploy.mjs
//   node scripts/deploy.mjs --skip-build   # reuse an existing .open-next build

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const PLACEHOLDER = "__D1_DATABASE_ID__";
const SOURCE_CONFIG = path.join(root, "wrangler.toml");
const GENERATED_CONFIG = path.join(root, "wrangler.generated.toml");

const skipBuild = process.argv.includes("--skip-build");

function fail(msg) {
  console.error(`\n[deploy] ERROR: ${msg}\n`);
  process.exit(1);
}

// 1. Resolve the real database id (fail fast and clearly if missing).
const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID;
if (!databaseId) {
  fail(
    "D1 database id not set. Provide CLOUDFLARE_D1_DATABASE_ID (or D1_DATABASE_ID).\n" +
      "  Local:  CLOUDFLARE_D1_DATABASE_ID=<id> npm run deploy:cf\n" +
      "  CI:     set the GitHub repo variable D1_DATABASE_ID (see README)."
  );
}

// 2. Generate the temp config with the placeholder replaced.
const source = readFileSync(SOURCE_CONFIG, "utf8");
if (!source.includes(PLACEHOLDER)) {
  fail(
    `Placeholder ${PLACEHOLDER} not found in wrangler.toml. ` +
      "The tracked config must keep the placeholder (the real id is injected here)."
  );
}
const generated = source.split(PLACEHOLDER).join(databaseId);
writeFileSync(GENERATED_CONFIG, generated, "utf8");
console.log(
  `[deploy] wrote ${path.basename(GENERATED_CONFIG)} (database_id injected from env)`
);

// 3. Build + deploy against the generated config, then always clean up.
function run(args, label) {
  console.log(`\n[deploy] ${label}: npx ${args.join(" ")}\n`);
  const res = spawnSync("npx", args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (res.status !== 0) {
    cleanup();
    fail(`${label} failed (exit ${res.status ?? "unknown"}).`);
  }
}

function cleanup() {
  try {
    rmSync(GENERATED_CONFIG, { force: true });
    console.log(`[deploy] removed ${path.basename(GENERATED_CONFIG)}`);
  } catch (err) {
    console.warn(`[deploy] WARNING: could not remove generated config: ${err}`);
  }
}

try {
  if (!skipBuild) {
    // open-next.config.ts forces `next build --webpack` via config.buildCommand.
    run(
      ["opennextjs-cloudflare", "build", "--config", GENERATED_CONFIG],
      "build"
    );
  } else {
    console.log("[deploy] --skip-build: reusing existing .open-next/ output");
  }
  run(
    ["opennextjs-cloudflare", "deploy", "--config", GENERATED_CONFIG],
    "deploy"
  );
} finally {
  cleanup();
}

console.log("\n[deploy] done.\n");
