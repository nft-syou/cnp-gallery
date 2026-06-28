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
