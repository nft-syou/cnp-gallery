import { CSV_TO_DB, STAT_FIELDS } from "./fields";

export interface TokenRow {
  token_id: number; name: string; description: string; image_url: string;
  character: string; clan: string; ninjutsu: string; weapon_back: string;
  weapon_front: string; cosplay: string; acc_body: string; acc_head: string;
  acc_face: string; mokuton: number; katon: number; doton: number;
  kinton: number; suiton: number;
  // epoch ms, set by the refresh route whenever this token's data changes
  // (incl. art changes like バー忍). NULL for never-updated (seeded) tokens.
  updated_at?: number | null;
}

// Cache-busting image URL. Appending updated_at as ?v makes both the browser and
// the Cloudflare image cache treat a changed token as a new resource — so a 更新
// shows the new art immediately — while letting unchanged images cache as long as
// we like. (Verified: the CF image cache keys on this query string.)
export function tokenImageUrl(t: Pick<TokenRow, "image_url" | "updated_at">): string {
  return t.updated_at ? `${t.image_url}?v=${t.updated_at}` : t.image_url;
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
