// Custom Cloudflare Worker entry.
//
// OpenNext generates `.open-next/worker.js` exporting only a `fetch` handler
// (plus its Durable Object classes). To run the Queue consumer in the SAME
// Worker we wrap that generated worker: reuse its `fetch`, add a `queue`
// handler, and re-export the Durable Object classes it defines.
//
// `wrangler.toml` `main` points here. `.open-next/worker.js` is a BUILD ARTIFACT
// (gitignored, produced by `opennextjs-cloudflare build`), so it does not exist
// at lint/typecheck time and is not type-checked. This file is therefore
// excluded from the app `tsconfig.json` and validated only by the OpenNext/esbuild
// bundle step. Keep it minimal.

// @ts-expect-error - resolved by the OpenNext build (.open-next is gitignored)
import openNextHandler from "./.open-next/worker.js";
import { handleQueue, type ConsumerEnv } from "./src/queue/consumer";

export default {
  fetch: openNextHandler.fetch,
  // The generic ExportedHandler types the batch as MessageBatch<unknown> and env
  // as the global CloudflareEnv; the cnp-sync queue only ever carries
  // { tokenId: number } (producer in db.ts) and the runtime env carries the app
  // bindings (DB, SYNC_QUEUE) plus the OpenNext WORKER_SELF_REFERENCE, so we
  // narrow at this boundary.
  queue: (batch, env) =>
    handleQueue(batch as MessageBatch<{ tokenId: number }>, env as unknown as ConsumerEnv),
} satisfies ExportedHandler<CloudflareEnv>;

// Re-export the Durable Objects the generated worker relies on (tag cache,
// revalidation queue, cache purge). Wrangler needs these exported from the entry
// module that `main` points to.
// @ts-expect-error - resolved by the OpenNext build (.open-next is gitignored)
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
