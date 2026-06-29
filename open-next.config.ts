import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// Caching strategy (see README "Caching" section).
//
// The gallery caches its D1 reads with `unstable_cache(..., { tags })` and the
// /token/[id] route is cacheable; the refresh route busts those tags via
// revalidateTag after an UPDATE. For revalidateTag to actually do anything, two
// pieces are required and BOTH are configured here:
//
//   1. incrementalCache — where the cached values live. With the default "dummy"
//      cache nothing is persisted (its get/set throw), so there would be nothing
//      to revalidate. We use the R2 incremental cache (OpenNext's documented
//      default). Requires one R2 bucket bound as NEXT_INC_CACHE_R2_BUCKET.
//
//   2. tagCache — the tag -> last-revalidated index that revalidateTag writes to
//      and that cache reads consult. We use the sharded Durable Object tag cache
//      (stable in 1.20.1). It needs NO external resource: the DOShardedTagCache
//      Durable Object (exported by the generated .open-next/worker.js) is
//      deployed with the Worker. Bound as the NEXT_TAG_CACHE_DO_SHARDED
//      durable_object + a [[migrations]] entry in wrangler.toml.
//
// enableCacheInterception serves cacheable routes (e.g. /token/[id]) straight
// from the incremental cache at the routing layer, skipping a full server render
// — the speed-first win. It must be false only when PPR is used; this app does
// not use PPR, so we enable it.
const config = defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: doShardedTagCache,
  enableCacheInterception: true,
});

// Next 16 defaults `next build` to Turbopack, whose output OpenNext 1.20 cannot
// bundle correctly for the Workers runtime — it fails at runtime with
// `ChunkLoadError` / `components.ComponentMod.handler is not a function` (every
// route 500s). Force the webpack builder so OpenNext gets the .next layout it
// expects. OpenNext sets NEXT_PRIVATE_STANDALONE so standalone output is still produced.
config.buildCommand = "npx next build --webpack";

export default config;
