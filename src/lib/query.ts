import { CATEGORICAL_FIELDS, type CategoricalField } from "./fields";
import type { Filters, SortKey } from "./filters";

// Fixed ORDER BY per sort key — never built from user input. token_id is the
// tiebreaker (and sole key for the id sorts) so paging is deterministic.
const ORDER_BY: Record<SortKey, string> = {
  "id-asc": "token_id ASC",
  "id-desc": "token_id DESC",
  character: "character ASC, token_id ASC",
  clan: "clan ASC, token_id ASC",
  total: "(mokuton + katon + doton + kinton + suiton) DESC, token_id ASC",
};

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
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const offset = f.cursor ?? 0;
  const sql = `SELECT * FROM tokens ${where} ORDER BY ${ORDER_BY[f.sort]} LIMIT ? OFFSET ?`.replace(/\s+/g, " ").trim();
  params.push(limit, offset);
  return { sql, params };
}

export function buildFacetQuery(field: CategoricalField, f: Filters): { sql: string; params: (string | number)[] } {
  const { parts, params } = conditions(f, field);
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const sql = `SELECT ${field} AS value, COUNT(*) AS n FROM tokens ${where} GROUP BY ${field} ORDER BY n DESC`
    .replace(/\s+/g, " ").trim();
  return { sql, params };
}
