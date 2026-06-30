import { CATEGORICAL_FIELDS, STAT_FIELDS, type CategoricalField, type StatField } from "./fields";

// Sort options surfaced in the gallery. Each maps to a fixed ORDER BY in
// query.ts (never interpolated from user input), so the value is safe to trust
// once validated here.
export const SORT_KEYS = ["id-asc", "id-desc", "character", "clan", "total"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "id-asc";

// How many tokens per page. A fixed whitelist so the `per` query param can't be
// abused to request an unbounded page.
export const PER_PAGE_OPTIONS = [24, 48, 96] as const;
export const DEFAULT_PER = 48;

export interface Filters {
  categorical: Partial<Record<CategoricalField, string[]>>;
  stats: Partial<Record<StatField, { min: number; max: number }>>;
  sort: SortKey;
  cursor: number | null; // page offset (rows to skip); null = first page
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
  const sRaw = first(params.sort);
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(sRaw ?? "") ? (sRaw as SortKey) : DEFAULT_SORT;
  const cRaw = first(params.cursor);
  const cursor = cRaw && !Number.isNaN(Number(cRaw)) ? Math.max(0, Math.floor(Number(cRaw))) : null;
  return { categorical, stats, sort, cursor };
}

// Page size — validated against the whitelist; anything else falls back to the default.
export function parsePerPage(params: Params): number {
  const n = Number(first(params.per));
  return (PER_PAGE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PER;
}
