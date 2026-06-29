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
    if ((current as unknown as Record<string, unknown>)[k] !== v) update[k] = v as string | number;
  }
  return update as Partial<TokenRow>;
}
