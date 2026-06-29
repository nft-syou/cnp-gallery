import { sourceToFields, diffUpdate } from "@/lib/sync";
import type { TokenRow } from "@/lib/csv";
import type { CloudflareEnv } from "@/lib/db";

const SOURCE = "https://data.cryptoninjapartners.com/new/json";

// Source JSON shape (confirmed): { name, description, image, edition, attributes:[{trait_type,value}] }.
interface SourceJson {
  name?: string;
  image?: string;
  attributes?: { trait_type: string; value: string | number }[];
}

// Env the consumer needs beyond DB. WORKER_SELF_REFERENCE is the OpenNext-provided
// service binding that lets the Worker call its own Next routes (used to trigger
// revalidateTag from inside the request lifecycle). REVALIDATE_SECRET guards that
// route, which is now fail-closed: if the secret is unset the route returns 401
// and cache invalidation is skipped (the D1 write still succeeds). Set the secret
// before deploy (`wrangler secret put REVALIDATE_SECRET`). Both are typed optional
// so the UPDATE path still works (best-effort revalidation) if wiring is absent.
export type ConsumerEnv = CloudflareEnv & {
  WORKER_SELF_REFERENCE?: { fetch: typeof fetch };
  REVALIDATE_SECRET?: string;
};

// Ask the Next.js app to revalidate the cache tags for this token. revalidateTag
// can only run inside a request, so we call the internal route via the Worker's
// self-reference binding. Cache invalidation is best-effort: a failure here must
// NOT cause the queue message to retry (the D1 write already succeeded).
async function revalidate(env: ConsumerEnv, tokenId: number): Promise<void> {
  const self = env.WORKER_SELF_REFERENCE;
  if (!self) return; // No self-reference binding configured; skip (see report).
  try {
    const res = await self.fetch("https://worker/api/internal/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.REVALIDATE_SECRET ? { "x-revalidate-secret": env.REVALIDATE_SECRET } : {}),
      },
      body: JSON.stringify({ tokenId }),
    });
    // Best-effort: surface a secret mismatch (401) / bad request in `wrangler
    // tail` without failing the message (the D1 write already committed).
    if (!res.ok) console.warn(`revalidate failed: ${res.status}`);
  } catch (err) {
    // swallow: cache will fall back to time-based revalidation
    console.warn("revalidate error", err);
  }
}

export async function handleQueue(
  batch: MessageBatch<{ tokenId: number }>,
  env: ConsumerEnv,
): Promise<void> {
  for (const msg of batch.messages) {
    const id = msg.body.tokenId;
    try {
      const res = await fetch(`${SOURCE}/${id}.json`);
      if (!res.ok) {
        // Distinguish transient from permanent source failures. 5xx/429 are
        // transient (upstream hiccup / rate limit) -> retry (bounded by
        // max_retries). 4xx incl. 404 (token unrevealed / no data) are
        // permanent -> ack so it doesn't retry forever.
        if (res.status >= 500 || res.status === 429) msg.retry();
        else msg.ack();
        continue;
      }
      const src = (await res.json()) as SourceJson;
      const current = await env.DB.prepare("SELECT * FROM tokens WHERE token_id = ?")
        .bind(id)
        .first<TokenRow>();
      if (!current) {
        msg.ack();
        continue;
      }
      const update = diffUpdate(current, sourceToFields(src));
      const keys = Object.keys(update);
      if (keys.length) {
        // Column names come only from diffUpdate keys, which originate from the
        // CSV_TO_DB whitelist (src/lib/fields.ts) — not from arbitrary source
        // input — so the interpolated SET is injection-safe. Values are bound.
        const set = keys.map((k) => `${k} = ?`).join(", ");
        await env.DB.prepare(`UPDATE tokens SET ${set}, updated_at = ? WHERE token_id = ?`)
          .bind(...keys.map((k) => (update as Record<string, unknown>)[k]), Date.now(), id)
          .run();
        // Only invalidate caches when something actually changed.
        await revalidate(env, id);
      }
      msg.ack();
    } catch {
      // Transient failure (network / D1). Let the queue retry per max_retries.
      msg.retry();
    }
  }
}
