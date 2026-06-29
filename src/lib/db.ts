import { getCloudflareContext } from "@opennextjs/cloudflare";
import { unstable_cache } from "next/cache";
import type { TokenRow } from "./csv";
import { CATEGORICAL_FIELDS, type CategoricalField } from "./fields";
import { buildListQuery, buildFacetQuery } from "./query";
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
  const out = {} as Record<CategoricalField, Facet[]>;
  for (const field of CATEGORICAL_FIELDS) {
    const { sql, params } = buildFacetQuery(field, f);
    const r = await db().prepare(sql).bind(...params).all<Facet>();
    out[field] = (r.results ?? []).filter((x) => x.value && x.value !== "None");
  }
  return out;
}

async function totalCountUncached(f: Filters): Promise<number> {
  const { sql, params } = buildListQuery({ ...f, cursor: null }, 1);
  const countSql = sql.replace("SELECT * FROM tokens", "SELECT COUNT(*) AS n FROM tokens")
    .replace(/ ORDER BY .*$/, "");
  const r = await db().prepare(countSql).bind(...params.slice(0, -1)).first<{ n: number }>();
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
