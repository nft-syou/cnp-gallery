import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { TokenRow } from "@/lib/csv";
import { sourceToFields, diffUpdate } from "@/lib/sync";
import { TAG_LIST, tagToken } from "@/lib/db";

const SOURCE = "https://data.cryptoninjapartners.com/new/json";

// Button-triggered metadata refresh. Runs the whole sync synchronously inside the
// request: fetch the source JSON, diff it against D1, UPDATE changed columns, and
// (only if something changed) revalidate the affected cache tags. Because this
// runs in the Next.js request lifecycle, revalidateTag works directly — no Queue,
// consumer, or internal self-referencing route. This keeps the app on the free
// Workers plan (Cloudflare Queues require Workers Paid).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const db = (getCloudflareContext().env as unknown as { DB: D1Database }).DB;

  let res: Response;
  try {
    res = await fetch(`${SOURCE}/${id}.json`);
  } catch {
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 502 });
  }
  if (!res.ok) {
    // 5xx/429 are transient (upstream hiccup / rate limit) -> 502 so the client
    // can retry; 4xx incl. 404 (token unrevealed / no data) are permanent -> 404.
    const status = res.status >= 500 || res.status === 429 ? 502 : 404;
    return NextResponse.json({ ok: false, error: `source_${res.status}` }, { status });
  }
  const src = (await res.json()) as { name?: string; image?: string; attributes?: { trait_type: string; value: string | number }[] };
  const current = await db.prepare("SELECT * FROM tokens WHERE token_id = ?").bind(id).first<TokenRow>();
  if (!current) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const update = diffUpdate(current, sourceToFields(src));
  const keys = Object.keys(update);
  let updated = false;
  if (keys.length) {
    // SET column names come only from diffUpdate keys, which originate from the
    // CSV_TO_DB whitelist (src/lib/fields.ts) — not arbitrary source input — so
    // the interpolated SET is injection-safe. Values are bound.
    const set = keys.map((k) => `${k} = ?`).join(", ");
    await db.prepare(`UPDATE tokens SET ${set}, updated_at = ? WHERE token_id = ?`)
      .bind(...keys.map((k) => (update as Record<string, unknown>)[k]), Date.now(), id).run();
    // A token change can shift facet counts / list ordering, so bust the whole
    // gallery tag as well as the single token detail. "max" is the Next 16
    // cache-life profile (longest stale window) for on-demand invalidation.
    revalidateTag(tagToken(id), "max");
    revalidateTag(TAG_LIST, "max");
    updated = true;
  }
  return NextResponse.json({ ok: true, updated });
}
