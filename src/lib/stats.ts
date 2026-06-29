import { STAT_FIELDS } from "./fields";
import type { TokenRow } from "./csv";

export function toRadarData(t: TokenRow): { stat: string; value: number }[] {
  return STAT_FIELDS.map((s) => ({ stat: s.toUpperCase(), value: t[s] as number }));
}
