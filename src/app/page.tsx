import { parseFilters } from "@/lib/filters";
import { listTokens, facets, totalCount } from "@/lib/db";
import { GalleryGrid } from "@/components/GalleryGrid";
import { FilterSidebar } from "@/components/FilterSidebar";

// No `force-dynamic`: the page already renders dynamically because it awaits
// `searchParams`. The cache layer that matters here is the per-query
// `unstable_cache(..., { tags: [TAG_LIST] })` in @/lib/db — the refresh route
// busts TAG_LIST via revalidateTag so the gallery refreshes after a sync.
const PAGE = 48;

export default async function Home({ searchParams }:
  { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [tokens, facetData, total] = await Promise.all([
    listTokens(filters, PAGE + 1), facets(filters), totalCount(filters),
  ]);
  const hasMore = tokens.length > PAGE;
  const page = tokens.slice(0, PAGE);
  let nextHref: string | null = null;
  if (hasMore) {
    const params = new URLSearchParams(
      Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? (v[0] ?? "") : v ?? ""] as [string, string]));
    params.set("cursor", String(page[page.length - 1].token_id));
    nextHref = `/?${params.toString()}`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-9 pb-24 md:pb-16">
      {/* ---- masthead ---- */}
      <header className="flex flex-wrap items-end justify-between gap-5 pb-7">
        <div className="flex items-center gap-3.5">
          <span aria-hidden
            className="seal grid h-11 w-11 place-items-center rounded-[13px] bg-cnp font-display text-xl font-black text-ink shadow-[0_10px_26px_-8px_rgba(255,202,0,0.95)]">
            忍
          </span>
          <div>
            <h1 className="font-display text-[30px] font-black leading-none tracking-tight text-ink">
              CNP <span className="marker">Gallery</span>
            </h1>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted">
              CryptoNinja Partners · 22,222 revealed
            </p>
          </div>
        </div>

        <form action="/token" className="relative w-full sm:w-auto">
          <label htmlFor="token-search" className="sr-only">token ID で検索</label>
          <span aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">⌕</span>
          <input
            id="token-search"
            name="id"
            inputMode="numeric"
            placeholder="token ID を入力"
            className="w-full rounded-full border border-line-2 bg-white py-2 pl-9 pr-4 text-sm text-ink transition focus:border-cnp-deep focus:shadow-[0_0_0_3px_rgba(255,214,0,0.25)] focus:outline-none sm:w-56 sm:max-w-[60vw]"
          />
        </form>
      </header>

      {/* ---- count rule ---- */}
      <div className="mb-6 flex items-baseline gap-3 border-t border-line pt-3">
        <span className="font-display text-2xl font-black leading-none tabular-nums text-ink">
          {total.toLocaleString()}
        </span>
        <span className="text-xs text-muted">体を収蔵</span>
        <span className="ml-auto text-[11px] uppercase tracking-[0.2em] text-faint">Revealed Collection</span>
      </div>

      {/* ---- body ---- */}
      <div className="flex items-start gap-7">
        <FilterSidebar facets={facetData} filters={filters} />
        <div className="min-w-0 flex-1">
          <GalleryGrid tokens={page} nextHref={nextHref} />
        </div>
      </div>
    </main>
  );
}
