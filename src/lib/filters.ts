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
