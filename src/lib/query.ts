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
