# CNP Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast CNP NFT gallery (22,222 revealed tokens) with trait filtering, token detail pages, and button-triggered metadata sync, on Cloudflare.

**Architecture:** Next.js (App Router) deployed to Cloudflare Workers via OpenNext. Metadata lives in D1 (single denormalized `tokens` table). The gallery list is a Server Component reading filters from URL query params and querying D1; results are edge-cached. A per-token "更新" button enqueues a Cloudflare Queue job; a consumer Worker re-fetches the source JSON, updates D1, and invalidates caches. Images are optimized via Cloudflare Image Transformations through a custom Next image loader.

**Tech Stack:** Next.js 15 (App Router), @opennextjs/cloudflare, Cloudflare D1 / Queues / Image Transformations, Tailwind CSS, Recharts (radar), Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-29-cnp-gallery-design.md`

**Source data:** `\\wsl.localhost\Ubuntu\home\user\git\cnp-metadata\csv\output.csv` (24,444 rows; keep only revealed = 22,222). Metadata API: `https://data.cryptoninjapartners.com/new/json/{id}.json`.

**Conventions used throughout this plan:**
- Field name mapping CSV → DB column:
  `tokenId→token_id, name→name, description→description, image→image_url, NINJUTSU→ninjutsu, WEAPON(BACK)→weapon_back, CHARACTER→character, CLAN→clan, COSPLAY→cosplay, ACCESSORIES(BODY)→acc_body, ACCESSORIES(HEAD)→acc_head, ACCESSORIES(FACE)→acc_face, WEAPON(FRONT)→weapon_front, MOKUTON→mokuton, KATON→katon, DOTON→doton, KINTON→kinton, SUITON→suiton`
- Categorical (filterable) fields: `character, clan, ninjutsu, weapon_back, weapon_front, cosplay, acc_body, acc_head, acc_face`
- Stat fields: `mokuton, katon, doton, kinton, suiton`
- "Revealed" = `ninjutsu` value is non-empty (reveal-pending rows have empty trait columns).
- Run all commands from the project root `C:\Users\user\Documents\git\cnp-gallery`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts` | Project + tooling config |
| `wrangler.toml`, `open-next.config.ts` | Cloudflare bindings (D1, Queue) + OpenNext |
| `tailwind.config.ts`, `src/app/globals.css` | Styling + CNP pop theme tokens |
| `migrations/0001_init.sql` | D1 schema + indexes |
| `src/lib/fields.ts` | Single source of truth for field lists + CSV→DB mapping |
| `src/lib/csv.ts` | CSV row → token object; reveal filter (pure, tested) |
| `scripts/seed.ts` | Parse CSV and batch-insert into D1 |
| `src/lib/query.ts` | Filter WHERE / list / facet / keyset SQL builders (pure, tested) |
| `src/lib/filters.ts` | Parse URL searchParams → Filters object (pure, tested) |
| `src/lib/image-loader.ts` | Cloudflare Image Transformations URL (pure, tested) |
| `src/lib/db.ts` | D1 accessor (`getDb()`) + typed query helpers |
| `src/lib/sync.ts` | source JSON → DB diff/update (pure diff, tested) |
| `src/components/TokenCard.tsx` | Grid card |
| `src/components/GalleryGrid.tsx` | Grid + load-more |
| `src/components/FilterSidebar.tsx`, `FacetGroup.tsx`, `StatRangeFilter.tsx` | Filter UI |
| `src/components/StatRadar.tsx` | Recharts radar (client) |
| `src/components/RefreshButton.tsx` | Enqueue sync (client) |
| `src/app/page.tsx` | Gallery page (Server Component) |
| `src/app/token/[id]/page.tsx` | Detail page + OGP |
| `src/app/api/tokens/route.ts` | Load-more JSON |
| `src/app/api/tokens/[id]/refresh/route.ts` | Enqueue refresh |
| `src/queue/consumer.ts` | Queue consumer handler |

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore` (exists), `src/lib/.gitkeep`

- [ ] **Step 1: Scaffold Next.js app (non-interactive)**

Run:
```bash
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes
```
Expected: project files generated under `src/` (App Router at `src/app/`). If it refuses due to the existing `docs/`/`.git`, scaffold in a temp dir and copy in, preserving `docs/` and `.gitignore`.

- [ ] **Step 2: Add Cloudflare + test deps**

Run:
```bash
npm i @opennextjs/cloudflare
npm i -D wrangler vitest @types/node tsx
npm i recharts
```
Expected: installs succeed.

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Add test script to package.json**

In `package.json` `"scripts"`, add: `"test": "vitest run"`, `"test:watch": "vitest"`, `"seed": "tsx scripts/seed.ts"`.

- [ ] **Step 5: Verify tooling runs**

Run: `npm run test`
Expected: Vitest runs and reports "No test files found" (exit 0) — confirms config loads.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "chore: scaffold Next.js + Cloudflare + Vitest tooling"
```

---

## Task 2: Cloudflare bindings (wrangler + OpenNext)

**Files:**
- Create: `wrangler.toml`, `open-next.config.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Create `wrangler.toml`**
```toml
name = "cnp-gallery"
compatibility_date = "2025-03-01"
compatibility_flags = ["nodejs_compat"]
main = ".open-next/worker.js"

[[d1_databases]]
binding = "DB"
database_name = "cnp-gallery"
database_id = "PLACEHOLDER_SET_AFTER_CREATE"

[[queues.producers]]
binding = "SYNC_QUEUE"
queue = "cnp-sync"

[[queues.consumers]]
queue = "cnp-sync"
max_batch_size = 10
max_retries = 5
```

- [ ] **Step 2: Create D1 + Queue (records the real IDs)**
```bash
npx wrangler d1 create cnp-gallery
npx wrangler queues create cnp-sync
```
Expected: prints `database_id`. Paste it into `wrangler.toml` replacing `PLACEHOLDER_SET_AFTER_CREATE`.

- [ ] **Step 3: Create `open-next.config.ts`**
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

- [ ] **Step 4: Wire OpenNext dev binding in `next.config.ts`**
```ts
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

initOpenNextCloudflareForDev();
export default nextConfig;
```

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "chore: configure Cloudflare D1, Queue, and OpenNext bindings"
```

---

## Task 3: Field definitions (single source of truth)

**Files:**
- Create: `src/lib/fields.ts`, `src/lib/fields.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/fields.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { CATEGORICAL_FIELDS, STAT_FIELDS, CSV_TO_DB } from "./fields";

describe("fields", () => {
  it("maps CSV headers to db columns", () => {
    expect(CSV_TO_DB["WEAPON(BACK)"]).toBe("weapon_back");
    expect(CSV_TO_DB["CHARACTER"]).toBe("character");
    expect(CSV_TO_DB["MOKUTON"]).toBe("mokuton");
  });
  it("lists 9 categorical and 5 stat fields", () => {
    expect(CATEGORICAL_FIELDS).toHaveLength(9);
    expect(STAT_FIELDS).toHaveLength(5);
    expect(CATEGORICAL_FIELDS).toContain("clan");
    expect(STAT_FIELDS).toContain("katon");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/fields.test.ts`
Expected: FAIL — cannot find module `./fields`.

- [ ] **Step 3: Implement `src/lib/fields.ts`**
```ts
export const CATEGORICAL_FIELDS = [
  "character", "clan", "ninjutsu", "weapon_back", "weapon_front",
  "cosplay", "acc_body", "acc_head", "acc_face",
] as const;

export const STAT_FIELDS = ["mokuton", "katon", "doton", "kinton", "suiton"] as const;

export type CategoricalField = (typeof CATEGORICAL_FIELDS)[number];
export type StatField = (typeof STAT_FIELDS)[number];

export const CSV_TO_DB: Record<string, string> = {
  tokenId: "token_id", name: "name", description: "description", image: "image_url",
  NINJUTSU: "ninjutsu", "WEAPON(BACK)": "weapon_back", CHARACTER: "character",
  CLAN: "clan", COSPLAY: "cosplay", "ACCESSORIES(BODY)": "acc_body",
  "ACCESSORIES(HEAD)": "acc_head", "ACCESSORIES(FACE)": "acc_face",
  "WEAPON(FRONT)": "weapon_front", MOKUTON: "mokuton", KATON: "katon",
  DOTON: "doton", KINTON: "kinton", SUITON: "suiton",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/fields.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add field definitions and CSV-to-DB mapping"
```

---

## Task 4: CSV parsing + reveal filter

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/csv.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/csv.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rowToToken, isRevealed } from "./csv";

const header = ["tokenId","name","description","image","NINJUTSU","WEAPON(BACK)","CHARACTER","CLAN","COSPLAY","ACCESSORIES(BODY)","ACCESSORIES(HEAD)","ACCESSORIES(FACE)","WEAPON(FRONT)","MOKUTON","KATON","DOTON","KINTON","SUITON"];
const revealed = ["10001","Makami #10001","desc","https://x/10001.png","Katon","Katana","Makami","Iga","Gold","None","None","None","Shuriken","3","5","7","2","9"];
const pending  = ["26667","Makami #26667","desc","https://x/reveal.gif","","","Makami","Iga","","","","","","","","","",""];

describe("csv", () => {
  it("maps a row to a token object", () => {
    const t = rowToToken(header, revealed);
    expect(t.token_id).toBe(10001);
    expect(t.weapon_back).toBe("Katana");
    expect(t.katon).toBe(5);
    expect(t.image_url).toBe("https://x/10001.png");
  });
  it("detects revealed vs pending by ninjutsu emptiness", () => {
    expect(isRevealed(rowToToken(header, revealed))).toBe(true);
    expect(isRevealed(rowToToken(header, pending))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: FAIL — cannot find module `./csv`.

- [ ] **Step 3: Implement `src/lib/csv.ts`**
```ts
import { CSV_TO_DB, STAT_FIELDS } from "./fields";

export interface TokenRow {
  token_id: number; name: string; description: string; image_url: string;
  character: string; clan: string; ninjutsu: string; weapon_back: string;
  weapon_front: string; cosplay: string; acc_body: string; acc_head: string;
  acc_face: string; mokuton: number; katon: number; doton: number;
  kinton: number; suiton: number;
}

const STAT = new Set<string>(STAT_FIELDS);

export function rowToToken(header: string[], row: string[]): TokenRow {
  const o: Record<string, string | number> = {};
  header.forEach((h, i) => {
    const col = CSV_TO_DB[h];
    if (!col) return;
    const raw = (row[i] ?? "").trim();
    if (col === "token_id") o[col] = Number(raw);
    else if (STAT.has(col)) o[col] = raw === "" ? 0 : Number(raw);
    else o[col] = raw;
  });
  return o as unknown as TokenRow;
}

export function isRevealed(t: TokenRow): boolean {
  return t.ninjutsu !== "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add CSV row mapping and reveal detection"
```

---

## Task 5: D1 schema migration

**Files:**
- Create: `migrations/0001_init.sql`

- [ ] **Step 1: Write migration SQL**

`migrations/0001_init.sql`:
```sql
CREATE TABLE IF NOT EXISTS tokens (
  token_id     INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  image_url    TEXT NOT NULL,
  character    TEXT, clan TEXT, ninjutsu TEXT, weapon_back TEXT, weapon_front TEXT,
  cosplay      TEXT, acc_body TEXT, acc_head TEXT, acc_face TEXT,
  mokuton INTEGER, katon INTEGER, doton INTEGER, kinton INTEGER, suiton INTEGER,
  updated_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_character    ON tokens(character);
CREATE INDEX IF NOT EXISTS idx_clan         ON tokens(clan);
CREATE INDEX IF NOT EXISTS idx_ninjutsu     ON tokens(ninjutsu);
CREATE INDEX IF NOT EXISTS idx_weapon_back  ON tokens(weapon_back);
CREATE INDEX IF NOT EXISTS idx_weapon_front ON tokens(weapon_front);
CREATE INDEX IF NOT EXISTS idx_cosplay      ON tokens(cosplay);
CREATE INDEX IF NOT EXISTS idx_acc_body     ON tokens(acc_body);
CREATE INDEX IF NOT EXISTS idx_acc_head     ON tokens(acc_head);
CREATE INDEX IF NOT EXISTS idx_acc_face     ON tokens(acc_face);
```

- [ ] **Step 2: Apply locally**

Run: `npx wrangler d1 execute cnp-gallery --local --file ./migrations/0001_init.sql`
Expected: "Executed ... commands" with no error.

- [ ] **Step 3: Commit**
```bash
git add -A && git commit -m "feat: add D1 schema migration for tokens"
```

---

## Task 6: Seed script

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Implement `scripts/seed.ts`**

Reads the CSV, keeps revealed rows, writes a SQL file of batched INSERTs, then applies it with wrangler. (Using a generated SQL file keeps the script runtime-agnostic and lets `wrangler d1 execute` do the insert.)
```ts
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { parse } from "csv-parse/sync";
import { rowToToken, isRevealed, type TokenRow } from "../src/lib/csv";

const CSV_PATH = process.env.CSV_PATH ??
  "\\\\wsl.localhost\\Ubuntu\\home\\user\\git\\cnp-metadata\\csv\\output.csv";
const OUT = "migrations/seed.sql";
const COLS = ["token_id","name","description","image_url","character","clan","ninjutsu","weapon_back","weapon_front","cosplay","acc_body","acc_head","acc_face","mokuton","katon","doton","kinton","suiton"] as const;

function esc(v: string | number): string {
  if (typeof v === "number") return String(v);
  return "'" + v.replace(/'/g, "''") + "'";
}

const text = readFileSync(CSV_PATH, "utf8");
const records: string[][] = parse(text, { relax_column_count: true });
const header = records[0];
const tokens: TokenRow[] = records.slice(1).map((r) => rowToToken(header, r)).filter(isRevealed);
console.log(`revealed tokens: ${tokens.length}`); // expect 22222

const lines: string[] = ["DELETE FROM tokens;"];
const BATCH = 500;
for (let i = 0; i < tokens.length; i += BATCH) {
  const chunk = tokens.slice(i, i + BATCH);
  const values = chunk.map((t) =>
    "(" + COLS.map((c) => esc((t as Record<string, string | number>)[c])).join(",") + ")"
  ).join(",\n");
  lines.push(`INSERT INTO tokens (${COLS.join(",")}) VALUES\n${values};`);
}
writeFileSync(OUT, lines.join("\n"));
console.log(`wrote ${OUT}`);
execSync(`npx wrangler d1 execute cnp-gallery --local --file ./${OUT}`, { stdio: "inherit" });
```

- [ ] **Step 2: Install CSV parser**

Run: `npm i -D csv-parse`
Expected: installs.

- [ ] **Step 3: Run the seed**

Run: `npm run seed`
Expected: logs `revealed tokens: 22222`, writes `migrations/seed.sql`, applies to local D1 without error.

- [ ] **Step 4: Verify row count**

Run: `npx wrangler d1 execute cnp-gallery --local --command "SELECT COUNT(*) AS n FROM tokens"`
Expected: `n = 22222`.

- [ ] **Step 5: Commit (ignore generated seed.sql)**

Add `migrations/seed.sql` to `.gitignore`, then:
```bash
git add -A && git commit -m "feat: add D1 seed script for revealed tokens"
```

---

## Task 7: Filter parsing from URL searchParams

**Files:**
- Create: `src/lib/filters.ts`, `src/lib/filters.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/filters.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseFilters } from "./filters";

describe("parseFilters", () => {
  it("parses comma lists, stat ranges, sort, cursor", () => {
    const f = parseFilters({
      character: "Makami,Narukami", clan: "Iga",
      katon_min: "5", katon_max: "9", sort: "desc", cursor: "12000",
    });
    expect(f.categorical.character).toEqual(["Makami", "Narukami"]);
    expect(f.categorical.clan).toEqual(["Iga"]);
    expect(f.stats.katon).toEqual({ min: 5, max: 9 });
    expect(f.sort).toBe("desc");
    expect(f.cursor).toBe(12000);
  });
  it("defaults sort asc and ignores unknown fields", () => {
    const f = parseFilters({ bogus: "x" });
    expect(f.sort).toBe("asc");
    expect(Object.keys(f.categorical)).toHaveLength(0);
    expect(f.cursor).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/filters.test.ts`
Expected: FAIL — cannot find module `./filters`.

- [ ] **Step 3: Implement `src/lib/filters.ts`**
```ts
import { CATEGORICAL_FIELDS, STAT_FIELDS, type CategoricalField, type StatField } from "./fields";

export interface Filters {
  categorical: Partial<Record<CategoricalField, string[]>>;
  stats: Partial<Record<StatField, { min: number; max: number }>>;
  sort: "asc" | "desc";
  cursor: number | null;
}

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(params: Params): Filters {
  const categorical: Filters["categorical"] = {};
  for (const f of CATEGORICAL_FIELDS) {
    const raw = first(params[f]);
    if (raw) categorical[f] = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const stats: Filters["stats"] = {};
  for (const s of STAT_FIELDS) {
    const min = first(params[`${s}_min`]);
    const max = first(params[`${s}_max`]);
    if (min || max) stats[s] = { min: Number(min ?? 1), max: Number(max ?? 10) };
  }
  const sort = first(params.sort) === "desc" ? "desc" : "asc";
  const cRaw = first(params.cursor);
  const cursor = cRaw && !Number.isNaN(Number(cRaw)) ? Number(cRaw) : null;
  return { categorical, stats, sort, cursor };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/filters.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: parse gallery filters from URL params"
```

---

## Task 8: SQL builders (filter clause, list, facet)

**Files:**
- Create: `src/lib/query.ts`, `src/lib/query.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/query.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildWhere, buildListQuery, buildFacetQuery } from "./query";
import type { Filters } from "./filters";

const base: Filters = { categorical: {}, stats: {}, sort: "asc", cursor: null };

describe("buildWhere", () => {
  it("OR within a field, AND across fields, plus stat range", () => {
    const f: Filters = { ...base,
      categorical: { character: ["Makami", "Narukami"], clan: ["Iga"] },
      stats: { katon: { min: 5, max: 9 } } };
    const { where, params } = buildWhere(f);
    expect(where).toBe(
      "WHERE character IN (?,?) AND clan IN (?) AND katon >= ? AND katon <= ?");
    expect(params).toEqual(["Makami", "Narukami", "Iga", 5, 9]);
  });
  it("returns empty clause when no filters", () => {
    expect(buildWhere(base)).toEqual({ where: "", params: [] });
  });
});

describe("buildListQuery", () => {
  it("adds keyset cursor and ascending order", () => {
    const f: Filters = { ...base, categorical: { clan: ["Iga"] }, cursor: 100 };
    const { sql, params } = buildListQuery(f, 24);
    expect(sql).toBe(
      "SELECT * FROM tokens WHERE clan IN (?) AND token_id > ? ORDER BY token_id ASC LIMIT ?");
    expect(params).toEqual(["Iga", 100, 24]);
  });
  it("descending uses < cursor and DESC order", () => {
    const f: Filters = { ...base, sort: "desc", cursor: 5000 };
    const { sql, params } = buildListQuery(f, 24);
    expect(sql).toBe(
      "SELECT * FROM tokens WHERE token_id < ? ORDER BY token_id DESC LIMIT ?");
    expect(params).toEqual([5000, 24]);
  });
});

describe("buildFacetQuery", () => {
  it("counts a field excluding its own selection", () => {
    const f: Filters = { ...base, categorical: { character: ["Makami"], clan: ["Iga"] } };
    const { sql, params } = buildFacetQuery("character", f);
    expect(sql).toBe(
      "SELECT character AS value, COUNT(*) AS n FROM tokens WHERE clan IN (?) GROUP BY character ORDER BY n DESC");
    expect(params).toEqual(["Iga"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/query.test.ts`
Expected: FAIL — cannot find module `./query`.

- [ ] **Step 3: Implement `src/lib/query.ts`**
```ts
import { CATEGORICAL_FIELDS, type CategoricalField } from "./fields";
import type { Filters } from "./filters";

type Clause = { where: string; params: (string | number)[] };

function conditions(f: Filters, exclude?: CategoricalField) {
  const parts: string[] = [];
  const params: (string | number)[] = [];
  for (const field of CATEGORICAL_FIELDS) {
    if (field === exclude) continue;
    const vals = f.categorical[field];
    if (vals && vals.length) {
      parts.push(`${field} IN (${vals.map(() => "?").join(",")})`);
      params.push(...vals);
    }
  }
  for (const [stat, range] of Object.entries(f.stats)) {
    parts.push(`${stat} >= ? AND ${stat} <= ?`);
    params.push(range.min, range.max);
  }
  return { parts, params };
}

export function buildWhere(f: Filters): Clause {
  const { parts, params } = conditions(f);
  return { where: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

export function buildListQuery(f: Filters, limit: number): { sql: string; params: (string | number)[] } {
  const { parts, params } = conditions(f);
  if (f.cursor !== null) {
    parts.push(f.sort === "desc" ? "token_id < ?" : "token_id > ?");
    params.push(f.cursor);
  }
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const order = f.sort === "desc" ? "DESC" : "ASC";
  const sql = `SELECT * FROM tokens ${where} ORDER BY token_id ${order} LIMIT ?`.replace(/\s+/g, " ").trim();
  params.push(limit);
  return { sql, params };
}

export function buildFacetQuery(field: CategoricalField, f: Filters): { sql: string; params: (string | number)[] } {
  const { parts, params } = conditions(f, field);
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const sql = `SELECT ${field} AS value, COUNT(*) AS n FROM tokens ${where} GROUP BY ${field} ORDER BY n DESC`
    .replace(/\s+/g, " ").trim();
  return { sql, params };
}
```

> Note: `field`/`stat` names come only from the fixed whitelists in `fields.ts`, never from user input — safe against SQL injection. Values are always parameterized.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/query.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add SQL builders for filter, list, and facet queries"
```

---

## Task 9: Image Transformations loader

**Files:**
- Create: `src/lib/image-loader.ts`, `src/lib/image-loader.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/image-loader.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import cfLoader from "./image-loader";

describe("cfLoader", () => {
  it("builds a /cdn-cgi/image URL with width, quality, format", () => {
    const url = cfLoader({ src: "https://data.cryptoninjapartners.com/images/1.png", width: 240, quality: 70 });
    expect(url).toBe("/cdn-cgi/image/width=240,quality=70,format=auto/https://data.cryptoninjapartners.com/images/1.png");
  });
  it("defaults quality to 75", () => {
    const url = cfLoader({ src: "https://x/2.png", width: 320 });
    expect(url).toBe("/cdn-cgi/image/width=320,quality=75,format=auto/https://x/2.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/image-loader.test.ts`
Expected: FAIL — cannot find module `./image-loader`.

- [ ] **Step 3: Implement `src/lib/image-loader.ts`**
```ts
interface LoaderArgs { src: string; width: number; quality?: number }

export default function cfLoader({ src, width, quality }: LoaderArgs): string {
  const q = quality ?? 75;
  return `/cdn-cgi/image/width=${width},quality=${q},format=auto/${src}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/image-loader.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add Cloudflare Image Transformations loader"
```

---

## Task 10: DB accessor + typed helpers

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Implement `src/lib/db.ts`**
```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { TokenRow } from "./csv";
import { CATEGORICAL_FIELDS, type CategoricalField } from "./fields";
import { buildListQuery, buildFacetQuery } from "./query";
import type { Filters } from "./filters";

export interface CloudflareEnv {
  DB: D1Database;
  SYNC_QUEUE: Queue<{ tokenId: number }>;
}

function db(): D1Database {
  return (getCloudflareContext().env as unknown as CloudflareEnv).DB;
}

export function queue(): Queue<{ tokenId: number }> {
  return (getCloudflareContext().env as unknown as CloudflareEnv).SYNC_QUEUE;
}

export async function listTokens(f: Filters, limit = 48): Promise<TokenRow[]> {
  const { sql, params } = buildListQuery(f, limit);
  const r = await db().prepare(sql).bind(...params).all<TokenRow>();
  return r.results ?? [];
}

export async function getToken(id: number): Promise<TokenRow | null> {
  return await db().prepare("SELECT * FROM tokens WHERE token_id = ?").bind(id).first<TokenRow>();
}

export interface Facet { value: string; n: number }
export async function facets(f: Filters): Promise<Record<CategoricalField, Facet[]>> {
  const out = {} as Record<CategoricalField, Facet[]>;
  for (const field of CATEGORICAL_FIELDS) {
    const { sql, params } = buildFacetQuery(field, f);
    const r = await db().prepare(sql).bind(...params).all<Facet>();
    out[field] = (r.results ?? []).filter((x) => x.value && x.value !== "None");
  }
  return out;
}

export async function totalCount(f: Filters): Promise<number> {
  const { sql, params } = buildListQuery({ ...f, cursor: null }, 1);
  const countSql = sql.replace("SELECT * FROM tokens", "SELECT COUNT(*) AS n FROM tokens")
    .replace(/ ORDER BY .*$/, "");
  const r = await db().prepare(countSql).bind(...params.slice(0, -1)).first<{ n: number }>();
  return r?.n ?? 0;
}
```

> `D1Database` / `Queue` types come from `@cloudflare/workers-types` (installed in Step 2).

- [ ] **Step 2: Add workers types**

Run: `npm i -D @cloudflare/workers-types`
Then add `"@cloudflare/workers-types"` to `compilerOptions.types` in `tsconfig.json`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/db.ts`.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add D1 accessor and typed query helpers"
```

---

## Task 11: Tailwind CNP theme + TokenCard

**Files:**
- Modify: `tailwind.config.ts`, `src/app/globals.css`
- Create: `src/components/TokenCard.tsx`

- [ ] **Step 1: Add CNP palette to `tailwind.config.ts`**

In `theme.extend.colors`, add:
```ts
colors: {
  cnp: { pink: "#ff7eb6", blue: "#4cc9f0", yellow: "#ffd166", purple: "#9d8cff", ink: "#2b2b3a", bg: "#fff7fb" },
},
borderRadius: { card: "18px" },
```

- [ ] **Step 2: Implement `src/components/TokenCard.tsx`**
```tsx
import Image from "next/image";
import Link from "next/link";
import type { TokenRow } from "@/lib/csv";

const CLAN_COLOR: Record<string, string> = {
  Iga: "bg-pink-100 text-pink-700", Koka: "bg-sky-100 text-sky-700",
  Fuma: "bg-violet-100 text-violet-700", Saika: "bg-amber-100 text-amber-700",
};

export function TokenCard({ t }: { t: TokenRow }) {
  return (
    <Link href={`/token/${t.token_id}`} className="block rounded-card border-2 border-pink-100 bg-white shadow-sm overflow-hidden hover:-translate-y-0.5 transition">
      <Image src={t.image_url} alt={t.name} width={320} height={320}
        sizes="(max-width:640px) 50vw, 220px" className="w-full aspect-square object-cover bg-slate-100" />
      <div className="p-2.5">
        <div className="font-bold text-sm text-cnp-ink truncate">{t.name}</div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-slate-400">#{t.token_id}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CLAN_COLOR[t.clan] ?? "bg-slate-100 text-slate-600"}`}>{t.clan}</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add CNP theme tokens and TokenCard"
```

---

## Task 12: Gallery page + grid + sidebar

**Files:**
- Create: `src/components/GalleryGrid.tsx`, `src/components/FilterSidebar.tsx`, `src/components/FacetGroup.tsx`, `src/components/StatRangeFilter.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement `GalleryGrid.tsx` (server, renders cards + load-more link)**
```tsx
import { TokenCard } from "./TokenCard";
import type { TokenRow } from "@/lib/csv";

export function GalleryGrid({ tokens, nextHref }: { tokens: TokenRow[]; nextHref: string | null }) {
  return (
    <div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {tokens.map((t) => <TokenCard key={t.token_id} t={t} />)}
      </div>
      {nextHref && (
        <div className="mt-6 text-center">
          <a href={nextHref} className="inline-block rounded-full bg-cnp-pink text-white font-bold px-6 py-2">もっと見る</a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `FacetGroup.tsx` (client; toggles a value in the URL)**
```tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Facet } from "@/lib/db";

export function FacetGroup({ field, label, facets, selected }:
  { field: string; label: string; facets: Facet[]; selected: string[] }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();

  function toggle(value: string) {
    const set = new Set(selected);
    set.has(value) ? set.delete(value) : set.add(value);
    const params = new URLSearchParams(sp.toString());
    set.size ? params.set(field, [...set].join(",")) : params.delete(field);
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <details className="border-b border-pink-100 py-2" open>
      <summary className="text-xs font-bold text-cnp-pink cursor-pointer">{label}</summary>
      <div className="mt-1 max-h-48 overflow-auto">
        {facets.map((f) => (
          <label key={f.value} className="flex items-center gap-1.5 text-xs text-slate-600 py-0.5">
            <input type="checkbox" checked={selected.includes(f.value)} onChange={() => toggle(f.value)} />
            <span className="truncate">{f.value}</span>
            <span className="ml-auto text-[10px] text-slate-400">{f.n.toLocaleString()}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
```

- [ ] **Step 3: Implement `StatRangeFilter.tsx` (client; sets `{stat}_min/_max`)**
```tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STAT_FIELDS } from "@/lib/fields";

export function StatRangeFilter() {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    value ? params.set(key, value) : params.delete(key);
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  }
  return (
    <details className="border-b border-pink-100 py-2">
      <summary className="text-xs font-bold text-cnp-pink cursor-pointer">ステータス（5遁術）</summary>
      <div className="mt-1 space-y-1">
        {STAT_FIELDS.map((s) => (
          <div key={s} className="flex items-center gap-1 text-xs">
            <span className="w-16 uppercase text-slate-500">{s}</span>
            <input type="number" min={1} max={10} placeholder="min" defaultValue={sp.get(`${s}_min`) ?? ""}
              onBlur={(e) => set(`${s}_min`, e.target.value)} className="w-12 border rounded px-1" />
            <input type="number" min={1} max={10} placeholder="max" defaultValue={sp.get(`${s}_max`) ?? ""}
              onBlur={(e) => set(`${s}_max`, e.target.value)} className="w-12 border rounded px-1" />
          </div>
        ))}
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Implement `FilterSidebar.tsx` (server; renders facet groups)**
```tsx
import { FacetGroup } from "./FacetGroup";
import { StatRangeFilter } from "./StatRangeFilter";
import { CATEGORICAL_FIELDS, type CategoricalField } from "@/lib/fields";
import type { Facet } from "@/lib/db";
import type { Filters } from "@/lib/filters";

const LABEL: Record<CategoricalField, string> = {
  character: "CHARACTER", clan: "CLAN", ninjutsu: "NINJUTSU", weapon_back: "WEAPON (BACK)",
  weapon_front: "WEAPON (FRONT)", cosplay: "COSPLAY", acc_body: "ACCESSORIES (BODY)",
  acc_head: "ACCESSORIES (HEAD)", acc_face: "ACCESSORIES (FACE)",
};

export function FilterSidebar({ facets, filters }:
  { facets: Record<CategoricalField, Facet[]>; filters: Filters }) {
  return (
    <aside className="w-44 flex-none rounded-2xl border-2 border-pink-100 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold mb-1">フィルター</div>
      {CATEGORICAL_FIELDS.map((field) => (
        <FacetGroup key={field} field={field} label={LABEL[field]}
          facets={facets[field]} selected={filters.categorical[field] ?? []} />
      ))}
      <StatRangeFilter />
    </aside>
  );
}
```

- [ ] **Step 5: Implement `src/app/page.tsx`**
```tsx
import { parseFilters } from "@/lib/filters";
import { listTokens, facets, totalCount } from "@/lib/db";
import { GalleryGrid } from "@/components/GalleryGrid";
import { FilterSidebar } from "@/components/FilterSidebar";

export const dynamic = "force-dynamic";
const PAGE = 48;

export default async function Home({ searchParams }:
  { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [tokens, facetData, total] = await Promise.all([
    listTokens(filters, PAGE + 1), facets(filters), totalCount(filters),
  ]);
  const hasMore = tokens.length > PAGE;
  const page = tokens.slice(0, PAGE);
  let nextHref: string | null = null;
  if (hasMore) {
    const params = new URLSearchParams(
      Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0]! : v ?? ""]));
    params.set("cursor", String(page[page.length - 1].token_id));
    nextHref = `/?${params.toString()}`;
  }
  return (
    <main className="max-w-6xl mx-auto p-4">
      <header className="flex items-center gap-3 mb-4">
        <h1 className="font-extrabold text-cnp-pink text-xl">CNP <span className="text-cnp-blue">Gallery</span></h1>
        <form action="/token" className="ml-auto">
          <input name="id" placeholder="🔍 token IDで検索" className="rounded-full border-2 border-pink-100 px-3 py-1.5 text-sm" />
        </form>
      </header>
      <div className="text-xs text-slate-400 mb-2">{total.toLocaleString()} 件</div>
      <div className="flex gap-4">
        <FilterSidebar facets={facetData} filters={filters} />
        <div className="flex-1"><GalleryGrid tokens={page} nextHref={nextHref} /></div>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run dev and verify gallery renders with data**

Run: `npm run dev` then open `http://localhost:3000`.
Expected: grid of token cards from local D1, sidebar shows facet counts, "もっと見る" appends `cursor`. (If D1 binding is unavailable in `next dev`, use `npx wrangler dev` / `npx opennextjs-cloudflare preview` instead.)

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: gallery page with grid, facet sidebar, stat filters"
```

---

## Task 13: Load-more JSON route + token search route

**Files:**
- Create: `src/app/api/tokens/route.ts`, `src/app/token/route.ts`

- [ ] **Step 1: Implement `src/app/api/tokens/route.ts`**
```ts
import { NextRequest, NextResponse } from "next/server";
import { parseFilters } from "@/lib/filters";
import { listTokens } from "@/lib/db";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseFilters(params);
  const tokens = await listTokens(filters, 48);
  return NextResponse.json({ tokens });
}
```

- [ ] **Step 2: Implement `src/app/token/route.ts` (search box redirect → /token/[id])**
```ts
import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (id && /^\d+$/.test(id)) return NextResponse.redirect(new URL(`/token/${id}`, req.url));
  return NextResponse.redirect(new URL("/", req.url));
}
```

- [ ] **Step 3: Verify**

Run: `curl "http://localhost:3000/api/tokens?clan=Iga"` (with dev server running)
Expected: JSON `{ "tokens": [...] }`. And `http://localhost:3000/token?id=10001` redirects to `/token/10001`.

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat: add load-more API and token search redirect"
```

---

## Task 14: StatRadar + detail page + OGP

**Files:**
- Create: `src/components/StatRadar.tsx`, `src/lib/stats.ts`, `src/lib/stats.test.ts`
- Create: `src/app/token/[id]/page.tsx`

- [ ] **Step 1: Write the failing test for radar data shaping**

`src/lib/stats.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toRadarData } from "./stats";
import type { TokenRow } from "./csv";

describe("toRadarData", () => {
  it("maps the five stats into recharts rows", () => {
    const t = { mokuton: 3, katon: 5, doton: 7, kinton: 2, suiton: 9 } as TokenRow;
    expect(toRadarData(t)).toEqual([
      { stat: "MOKUTON", value: 3 }, { stat: "KATON", value: 5 },
      { stat: "DOTON", value: 7 }, { stat: "KINTON", value: 2 },
      { stat: "SUITON", value: 9 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL — cannot find module `./stats`.

- [ ] **Step 3: Implement `src/lib/stats.ts`**
```ts
import { STAT_FIELDS } from "./fields";
import type { TokenRow } from "./csv";

export function toRadarData(t: TokenRow): { stat: string; value: number }[] {
  return STAT_FIELDS.map((s) => ({ stat: s.toUpperCase(), value: t[s] as number }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `src/components/StatRadar.tsx` (client, Recharts)**
```tsx
"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export function StatRadar({ data }: { data: { stat: string; value: number }[] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="stat" />
          <PolarRadiusAxis domain={[0, 10]} tick={false} />
          <Radar dataKey="value" stroke="#ff7eb6" fill="#ff7eb6" fillOpacity={0.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Implement `src/app/token/[id]/page.tsx`**
```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getToken } from "@/lib/db";
import { toRadarData } from "@/lib/stats";
import { StatRadar } from "@/components/StatRadar";
import { RefreshButton } from "@/components/RefreshButton";
import { CATEGORICAL_FIELDS } from "@/lib/fields";

async function load(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  return getToken(n);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await load((await params).id);
  if (!t) return { title: "Not found | CNP Gallery" };
  return {
    title: `${t.name} | CNP Gallery`,
    openGraph: { title: t.name, images: [t.image_url] },
    twitter: { card: "summary_large_image", title: t.name, images: [t.image_url] },
  };
}

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await load(id);
  if (!t) notFound();
  return (
    <main className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-6">
      <Image src={t.image_url} alt={t.name} width={1024} height={1024} className="w-full rounded-card bg-slate-100" />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-extrabold text-xl text-cnp-ink">{t.name}</h1>
          <RefreshButton tokenId={t.token_id} />
        </div>
        <StatRadar data={toRadarData(t)} />
        <dl className="grid grid-cols-2 gap-2 mt-4 text-sm">
          {CATEGORICAL_FIELDS.map((f) => (
            <div key={f} className="rounded-lg bg-cnp-bg p-2">
              <dt className="text-[10px] uppercase text-slate-400">{f}</dt>
              <dd className="font-bold text-cnp-ink">{(t[f] as string) || "None"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: token detail page with radar and OGP"
```

---

## Task 15: Sync diff logic

**Files:**
- Create: `src/lib/sync.ts`, `src/lib/sync.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/sync.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sourceToFields, diffUpdate } from "./sync";
import type { TokenRow } from "./csv";

const sourceJson = {
  name: "Makami #10001", image: "https://x/10001.png",
  attributes: [
    { trait_type: "CHARACTER", value: "Makami" }, { trait_type: "CLAN", value: "Koka" },
    { trait_type: "KATON", value: 6 },
  ],
};

describe("sync", () => {
  it("flattens source JSON attributes into db fields", () => {
    const f = sourceToFields(sourceJson);
    expect(f.clan).toBe("Koka");
    expect(f.katon).toBe(6);
    expect(f.image_url).toBe("https://x/10001.png");
  });
  it("produces only changed columns", () => {
    const current = { clan: "Iga", katon: 5, character: "Makami", image_url: "https://x/10001.png" } as TokenRow;
    const update = diffUpdate(current, sourceToFields(sourceJson));
    expect(update).toEqual({ clan: "Koka", katon: 6 });
  });
  it("returns empty object when nothing changed", () => {
    const same = { clan: "Koka", katon: 6, character: "Makami", image_url: "https://x/10001.png" } as TokenRow;
    expect(diffUpdate(same, sourceToFields(sourceJson))).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sync.test.ts`
Expected: FAIL — cannot find module `./sync`.

- [ ] **Step 3: Implement `src/lib/sync.ts`**
```ts
import { CSV_TO_DB, STAT_FIELDS } from "./fields";
import type { TokenRow } from "./csv";

interface SourceJson { name?: string; image?: string; attributes?: { trait_type: string; value: string | number }[] }
const STAT = new Set<string>(STAT_FIELDS);

export function sourceToFields(src: SourceJson): Partial<TokenRow> {
  const out: Record<string, string | number> = {};
  if (src.name) out.name = src.name;
  if (src.image) out.image_url = src.image;
  for (const a of src.attributes ?? []) {
    const col = CSV_TO_DB[a.trait_type];
    if (!col) continue;
    out[col] = STAT.has(col) ? Number(a.value) : String(a.value);
  }
  return out as Partial<TokenRow>;
}

export function diffUpdate(current: TokenRow, next: Partial<TokenRow>): Partial<TokenRow> {
  const update: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(next)) {
    if ((current as Record<string, unknown>)[k] !== v) update[k] = v as string | number;
  }
  return update as Partial<TokenRow>;
}
```

> If the real `/new/json/{id}.json` shape differs from `{name, image, attributes[]}`, adjust `sourceToFields` and its test together — fetch one sample (`curl https://data.cryptoninjapartners.com/new/json/10001.json`) before implementing to confirm the shape.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sync.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: add metadata sync diff logic"
```

---

## Task 16: Refresh route + Queue consumer + cache invalidation

**Files:**
- Create: `src/app/api/tokens/[id]/refresh/route.ts`, `src/components/RefreshButton.tsx`, `src/queue/consumer.ts`
- Modify: `src/app/page.tsx`, `src/app/token/[id]/page.tsx` (cache tags), `open-next.config.ts` / worker entry for the consumer

- [ ] **Step 1: Implement `src/app/api/tokens/[id]/refresh/route.ts`**
```ts
import { NextRequest, NextResponse } from "next/server";
import { queue } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false }, { status: 400 });
  await queue().send({ tokenId: id });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement `src/components/RefreshButton.tsx`**
```tsx
"use client";
import { useState } from "react";

export function RefreshButton({ tokenId }: { tokenId: number }) {
  const [state, setState] = useState<"idle" | "sent">("idle");
  async function onClick() {
    await fetch(`/api/tokens/${tokenId}/refresh`, { method: "POST" });
    setState("sent");
  }
  return (
    <button onClick={onClick} disabled={state === "sent"}
      className="text-xs rounded-full border-2 border-pink-100 px-3 py-1 font-bold text-cnp-pink disabled:opacity-50">
      {state === "sent" ? "更新リクエスト受付済み" : "更新"}
    </button>
  );
}
```

- [ ] **Step 3: Implement `src/queue/consumer.ts`**
```ts
import { sourceToFields, diffUpdate } from "@/lib/sync";
import type { TokenRow } from "@/lib/csv";
import type { CloudflareEnv } from "@/lib/db";

const SOURCE = "https://data.cryptoninjapartners.com/new/json";

export async function handleQueue(batch: MessageBatch<{ tokenId: number }>, env: CloudflareEnv): Promise<void> {
  for (const msg of batch.messages) {
    const id = msg.body.tokenId;
    try {
      const res = await fetch(`${SOURCE}/${id}.json`);
      if (!res.ok) { msg.ack(); continue; }
      const src = await res.json();
      const current = await env.DB.prepare("SELECT * FROM tokens WHERE token_id = ?").bind(id).first<TokenRow>();
      if (!current) { msg.ack(); continue; }
      const update = diffUpdate(current, sourceToFields(src));
      const keys = Object.keys(update);
      if (keys.length) {
        const set = keys.map((k) => `${k} = ?`).join(", ");
        await env.DB.prepare(`UPDATE tokens SET ${set}, updated_at = ? WHERE token_id = ?`)
          .bind(...keys.map((k) => (update as Record<string, unknown>)[k]), Date.now(), id).run();
      }
      msg.ack();
    } catch {
      msg.retry();
    }
  }
}
```

> `updated_at` uses `Date.now()` in the Worker runtime (allowed there). Field names in the `UPDATE` come only from `diffUpdate`, whose keys originate from the `CSV_TO_DB` whitelist — safe.

- [ ] **Step 4: Register the consumer on the OpenNext worker**

OpenNext generates the fetch handler; add a `queue` export. Keep `open-next.config.ts` default, create a root `worker.ts` that re-exports OpenNext's worker `fetch` plus our `queue` handler, and point `wrangler.toml` `main` at it:
```ts
import { default as handler } from "./.open-next/worker.js";
import { handleQueue } from "./src/queue/consumer";
import type { CloudflareEnv } from "./src/lib/db";

export default {
  fetch: handler.fetch,
  async queue(batch: MessageBatch<{ tokenId: number }>, env: CloudflareEnv) {
    return handleQueue(batch, env);
  },
};
```
Set `wrangler.toml` `main = "worker.ts"`. (If OpenNext's worker export shape differs in the installed version, adapt the import to its documented entry — verify with `npx opennextjs-cloudflare build` output.)

- [ ] **Step 5: Add cache tags + revalidation**

In `src/app/token/[id]/page.tsx` and `src/app/page.tsx`, wrap D1 reads with `unstable_cache` tagged `token:{id}` and `tokens-list`. In `handleQueue`, after a successful update call OpenNext's cache purge for those tags (use `revalidateTag` via a server action invoked from the consumer, or the OpenNext cache API). Minimum viable approach: tag reads and call `revalidateTag("tokens-list")` / `revalidateTag(\`token:${id}\`)` from a small internal route the consumer hits after updating.

- [ ] **Step 6: Verify end-to-end (preview)**

Run: `npx opennextjs-cloudflare build && npx opennextjs-cloudflare preview`
Then POST refresh: `curl -X POST http://localhost:8787/api/tokens/10001/refresh`
Expected: `{ "ok": true }`; consumer logs a fetch + update; detail page reflects changes after revalidation.

- [ ] **Step 7: Commit**
```bash
git add -A && git commit -m "feat: button-triggered metadata sync via Queue + cache invalidation"
```

---

## Task 17: Caching, deploy, and final verification

**Files:**
- Modify: `src/app/page.tsx`, `src/app/token/[id]/page.tsx` (cache config), `wrangler.toml`

- [ ] **Step 1: Apply migration + seed to remote D1**
```bash
npx wrangler d1 execute cnp-gallery --remote --file ./migrations/0001_init.sql
CSV_PATH="..." npx tsx scripts/seed.ts   # then apply seed.sql with --remote
npx wrangler d1 execute cnp-gallery --remote --file ./migrations/seed.sql
```
Expected: remote `SELECT COUNT(*)` returns 22222.

- [ ] **Step 2: Deploy**
```bash
npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```
Expected: deploy succeeds; Worker URL printed.

- [ ] **Step 3: Enable Image Transformations**

In the Cloudflare dashboard for the zone, enable Image Transformations (Images → Transformations). Verify a thumbnail loads via `/cdn-cgi/image/...`.

- [ ] **Step 4: Run full test suite**

Run: `npm run test`
Expected: all unit tests pass (fields, csv, filters, query, image-loader, stats, sync).

- [ ] **Step 5: Smoke-test live**

Verify on the deployed URL: gallery loads fast, filters update URL + facet counts, "もっと見る" pages by cursor, detail page shows radar + OGP, "更新" button returns and (after a moment) reflects source.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "chore: production caching + deploy config"
```

---

## Self-Review Notes (completed)
- **Spec coverage:** stack (T1–2), schema (T5), seed/22,222 revealed (T4,T6), filter OR/AND + facet counts (T7,T8,T12), keyset paging (T8,T12,T13), ID search + detail + OGP (T13,T14), 5-stat radar + range filter (T12,T14), Image Transformations (T9,T17), Queues sync + cache invalidation (T15,T16), speed/edge caching (T16,T17), tests (every pure-logic task). No rarity, no burn handling — matches spec.
- **Type consistency:** `TokenRow`, `Filters`, `Facet`, `CloudflareEnv`, `buildWhere/buildListQuery/buildFacetQuery`, `sourceToFields/diffUpdate`, `toRadarData` names are used identically across tasks.
- **Open risk flagged inline:** real `/new/json` shape (T15) and OpenNext worker export shape (T16) must be confirmed against the installed versions during implementation.
