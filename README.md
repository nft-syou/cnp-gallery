# CNP Gallery

A fast image gallery and metadata explorer for the **22,222 revealed CryptoNinja
Partners (CNP)** tokens. Browse the full collection, filter by trait facets,
inspect per-token stats on a radar chart, and trigger an on-demand metadata
refresh that re-syncs a token from the source and busts its cache.

Runs on the **free** Cloudflare Workers plan (no Workers Paid / Queues
required) — the "更新" sync runs synchronously inside the refresh API route.

Design priorities:

- **Speed first.** Reads are cached at the edge and served on-demand; only
  changed data is recomputed.
- **No rarity.** This gallery intentionally does not compute or display rarity
  rankings — it shows traits and stats only.
- **Revealed scope.** Only the 22,222 revealed tokens are seeded (unrevealed /
  locked rows are filtered out at seed time).

## Stack

- **Next.js 16** (App Router, React Server Components, Turbopack) + **React 19**.
- **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
  `1.20.1` — the app is built into a Worker and deployed to Cloudflare.
- **Cloudflare D1** (SQLite) — token data store.
- **Cloudflare R2** — OpenNext incremental (edge) cache store.
- **Durable Objects** — OpenNext sharded tag cache (`revalidateTag` backend).
- **Cloudflare Image Transformations** (`/cdn-cgi/image/...`) — responsive
  images via a custom `next/image` loader (`src/lib/image-loader.ts`).
- **Tailwind CSS v4** + **Recharts** (stat radar).

## Architecture at a glance

- `src/app/page.tsx` — gallery `/`. Server Component; reads `searchParams`
  (filters + cursor), renders the grid, facet sidebar, and stat filters. Renders
  dynamically (it awaits `searchParams`); its D1 reads are cached with
  `unstable_cache(..., { tags: ["tokens-list"] })`.
- `src/app/token/[id]/page.tsx` — detail `/token/[id]`. Renders on-demand then
  caches; `generateMetadata` emits OGP/Twitter tags; the read is tagged
  `token:{id}`.
- `src/lib/db.ts` — D1 accessors (`listTokens` / `facets` / `totalCount` /
  `getToken`) wrapped in `unstable_cache` with the tags above. Exports `TAG_LIST`
  and `tagToken(id)`.
- `src/app/api/tokens/[id]/refresh/route.ts` — the "更新" button POSTs here. The
  route runs the whole sync **synchronously** in the request: fetch the source
  JSON → diff against D1 (`@/lib/sync`) → `UPDATE` changed columns → call
  `revalidateTag` for `token:{id}` and `tokens-list`. Because it runs inside the
  Next.js request lifecycle, `revalidateTag` works directly — no Queue, consumer,
  or internal self-referencing route, so the app needs no Workers Paid plan.

### Caching strategy

The cache that `revalidateTag` busts requires **two** OpenNext backends, both
configured in `open-next.config.ts`:

1. **Incremental cache (R2)** — where cached values are persisted. With
   OpenNext's default "dummy" cache nothing is stored, so there would be nothing
   to revalidate. Bound as `NEXT_INC_CACHE_R2_BUCKET`.
2. **Tag cache (sharded Durable Object)** — the tag → last-revalidated index that
   `revalidateTag` writes and that cache reads consult. Bound as the
   `NEXT_TAG_CACHE_DO_SHARDED` durable object (class `DOShardedTagCache`, declared
   in a `[[migrations]]` entry). Durable Objects deploy **with** the Worker, so no
   resource needs to be created beforehand.

`enableCacheInterception: true` serves cacheable routes (e.g. `/token/[id]`)
straight from the incremental cache at the routing layer, skipping a full server
render. (Safe here because the app does not use PPR.)

When the refresh route updates a token it invalidates `token:{id}` (that one
detail page) and `tokens-list` (the gallery, since a change can shift facet
counts / list order).

## Local development

```bash
npm install
npm run dev          # next dev — http://localhost:3000
```

`next.config.ts` calls `initOpenNextCloudflareForDev()`, so `getCloudflareContext()`
works in `next dev` against a **local** D1. Seed it first (below).

> Note on local dev: the sharded-DO tag cache and R2 cache bindings do **not**
> run under `next dev` (Wrangler prints a warning to that effect during build).
> That is expected — they take effect in `wrangler dev` / production. Local dev
> still reads/writes D1 normally.

## Seeding the database

The seed script reads a CSV of all tokens, keeps only the revealed ones, writes
`migrations/seed.sql`, and applies it.

```bash
# Uses CSV_PATH if set, else the default WSL path in scripts/seed.ts.
CSV_PATH="/path/to/output.csv" npm run seed
```

`npm run seed` applies to the **local** D1 (`wrangler d1 execute cnp-gallery
--local`). It prints `revealed tokens: 22222`. The schema lives in
`migrations/0001_init.sql`. For remote seeding see the deploy runbook.

## Testing

```bash
npm test             # vitest run (unit tests for lib/: csv, fields, filters,
                     # image-loader, query, stats, sync)
```

## Building (Cloudflare adapter)

```bash
npx opennextjs-cloudflare build      # next build + OpenNext bundle -> .open-next/
npx wrangler dev                     # optional: preview the built Worker locally
```

Local verification gate (all green):

```bash
npx tsc --noEmit
npm run lint
npm test
npx opennextjs-cloudflare build
```

---

## Deploy runbook (Cloudflare)

These steps require a Cloudflare account and create real resources. Run them in
order from the project root. They are **not** part of the local build.

The app runs on the **free** Workers plan: the Workers and D1 free tiers cover
it, the R2 free tier needs to be activated for the account (creating the bucket
below prompts you to), and the tag cache uses a SQLite Durable Object, which is
available on the free tier. There is no Cloudflare Queue (so no Workers Paid
requirement).

`wrangler.toml` ships with placeholder identifiers for resources that only exist
once created (`database_id = "local-dev-placeholder"`, `bucket_name =
"cnp-gallery-cache"`). Replace the placeholders with the real values the commands
below print.

1. **Create D1 and the R2 cache bucket**, then paste the real ids/names into
   `wrangler.toml`:

   ```bash
   npx wrangler d1 create cnp-gallery
   # -> copy the printed database_id into [[d1_databases]].database_id

   npx wrangler r2 bucket create cnp-gallery-cache
   # -> bucket name must match [[r2_buckets]].bucket_name (NEXT_INC_CACHE_R2_BUCKET)
   ```

   The Durable Object tag cache needs no `create` step — it is declared via the
   `[[durable_objects.bindings]]` + `[[migrations]]` (`new_sqlite_classes =
   ["DOShardedTagCache"]`) in `wrangler.toml` and is provisioned on deploy.

2. **Apply the schema and seed to remote D1:**

   ```bash
   npx wrangler d1 execute cnp-gallery --remote --file ./migrations/0001_init.sql

   # Generate migrations/seed.sql locally (writes the file; the --local apply it
   # also does is harmless), then apply it remotely:
   CSV_PATH="/path/to/output.csv" npm run seed
   npx wrangler d1 execute cnp-gallery --remote --file ./migrations/seed.sql

   # Verify the revealed count:
   npx wrangler d1 execute cnp-gallery --remote --command "SELECT COUNT(*) FROM tokens;"
   # expect 22222
   ```

3. **Build and deploy:**

   ```bash
   npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
   ```

4. **Enable Image Transformations** for the zone in the Cloudflare dashboard
   (Speed → Optimization → Image Transformations → enable for the zone). The
   gallery's `next/image` loader serves `/cdn-cgi/image/...` URLs, which 404
   until this is on.

### Live smoke test checklist

- [ ] Gallery `/` loads fast and shows the grid + the `22,222 件` count.
- [ ] Selecting a facet updates the URL and the facet counts recompute.
- [ ] "もっと見る" (load more) pages forward by cursor.
- [ ] A token detail page shows the stat radar and correct OGP/Twitter tags
      (check `<head>` or a link-preview debugger).
- [ ] On a detail page, the "更新" button runs the sync in-request (button shows
      「更新中…」 then 「更新しました」) → D1 is updated → the cache is busted and the
      change is visible on reload. `npx wrangler tail` shows the single POST to
      `/api/tokens/<id>/refresh` (no separate consumer invocation).
