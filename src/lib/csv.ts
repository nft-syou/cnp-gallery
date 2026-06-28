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
