import { getCloudflareContext } from "@opennextjs/cloudflare";
import { unstable_cache } from "next/cache";
import type { TokenRow } from "./csv";
import { CATEGORICAL_FIELDS, type CategoricalField } from "./fields";
import { buildListQuery, buildFacetQuery, buildWhere } from "./query";
import type { Filters } from "./filters";

export interface CloudflareEnv {
  DB: D1Database;
}

// Cache tags. The whole gallery (list + facets + count) shares one tag because
// any single token change can shift the facet counts and list order; the detail
// page is tagged per-token so a refresh only busts that one token.
export const TAG_LIST = "tokens-list";
export const tagToken = (id: number) => `token:${id}`;

function db(): D1Database {
  return (getCloudflareContext().env as unknown as CloudflareEnv).DB;
}

async function listTokensUncached(f: Filters, limit: number): Promise<TokenRow[]> {
  const { sql, params } = buildListQuery(f, limit);
  const r = await db().prepare(sql).bind(...params).all<TokenRow>();
  return r.results ?? [];
}

async function getTokenUncached(id: number): Promise<TokenRow | null> {
  return await db().prepare("SELECT * FROM tokens WHERE token_id = ?").bind(id).first<TokenRow>();
}

export interface Facet { value: string; n: number }
async function facetsUncached(f: Filters): Promise<Record<CategoricalField, Facet[]>> {
  // All 9 facet GROUP BYs run in ONE D1 round-trip via batch() (previously a
  // sequential await-loop = 9 round-trips). This is the big first-hit speedup;
  // repeated filter combos are additionally served from unstable_cache.
  const d = db();
  const stmts = CATEGORICAL_FIELDS.map((field) => {
    const { sql, params } = buildFacetQuery(field, f);
    return d.prepare(sql).bind(...params);
  });
  const results = await d.batch<Facet>(stmts);
  const out = {} as Record<CategoricalField, Facet[]>;
  CATEGORICAL_FIELDS.forEach((field, i) => {
    out[field] = (results[i].results ?? []).filter((x) => x.value && x.value !== "None");
  });
  return out;
}

async function totalCountUncached(f: Filters): Promise<number> {
  // Count matches the filters only — sort and paging don't affect the total.
  const { where, params } = buildWhere(f);
  const sql = `SELECT COUNT(*) AS n FROM tokens ${where}`.replace(/\s+/g, " ").trim();
  const r = await db().prepare(sql).bind(...params).first<{ n: number }>();
  return r?.n ?? 0;
}

// Stable cache key for a filter set. unstable_cache also hashes the bound
// arguments, but an explicit serialized key keeps entries deterministic and
// readable. The limit is included because it changes the result set.
const filterKey = (f: Filters, limit: number) => JSON.stringify({ f, limit });

// Public, cache-tagged reads. The gallery reads carry TAG_LIST; the detail read
// carries token:{id}. The refresh route (src/app/api/tokens/[id]/refresh) calls
// revalidateTag on these tags after an update so the edge cache refreshes.
export function listTokens(f: Filters, limit = 48): Promise<TokenRow[]> {
  return unstable_cache(
    () => listTokensUncached(f, limit),
    ["listTokens", filterKey(f, limit)],
    { tags: [TAG_LIST] },
  )();
}

export function getToken(id: number): Promise<TokenRow | null> {
  return unstable_cache(
    () => getTokenUncached(id),
    ["getToken", String(id)],
    { tags: [tagToken(id)] },
  )();
}

export function facets(f: Filters): Promise<Record<CategoricalField, Facet[]>> {
  return unstable_cache(
    () => facetsUncached(f),
    ["facets", filterKey(f, 0)],
    { tags: [TAG_LIST] },
  )();
}

export function totalCount(f: Filters): Promise<number> {
  return unstable_cache(
    () => totalCountUncached(f),
    ["totalCount", filterKey(f, 0)],
    { tags: [TAG_LIST] },
  )();
}

// All revealed token ids (ascending) — for the sitemap. The token set is fixed
// (no burns), so this is effectively immutable; cached under TAG_LIST.
function allTokenIdsUncached(): Promise<number[]> {
  return db().prepare("SELECT token_id FROM tokens ORDER BY token_id")
    .all<{ token_id: number }>()
    .then((r) => (r.results ?? []).map((x) => x.token_id));
}
export function allTokenIds(): Promise<number[]> {
  return unstable_cache(allTokenIdsUncached, ["allTokenIds"], { tags: [TAG_LIST] })();
}
