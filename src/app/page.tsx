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
    <main className="max-w-6xl w-full mx-auto px-5 pt-9 pb-16">
      {/* ---- masthead ---- */}
      <header className="flex flex-wrap items-end justify-between gap-5 pb-7">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="seal grid place-items-center w-12 h-12 rounded-[14px] bg-shu text-2xl font-display font-semibold text-[#1b0c08] shadow-[0_8px_30px_-8px_rgba(239,75,58,0.7)] ring-1 ring-shu-soft/40"
          >
            忍
          </span>
          <div>
            <h1 className="font-display text-3xl/none tracking-tight text-ink">
              CNP <span className="italic font-medium text-shu-soft">Gallery</span>
            </h1>
            <p className="mt-1.5 text-[11px] tracking-[0.28em] text-faint uppercase">
              墨と遁 — CryptoNinja Partners
            </p>
          </div>
        </div>

        <form action="/token" className="relative">
          <label htmlFor="token-search" className="sr-only">token ID で検索</label>
          <span aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint text-sm">⌕</span>
          <input
            id="token-search"
            name="id"
            inputMode="numeric"
            placeholder="token ID を入力"
            className="w-56 max-w-[60vw] rounded-full bg-surface border border-line pl-9 pr-4 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-shu focus:bg-surface-2 transition-colors"
          />
        </form>
      </header>

      {/* ---- count rule ---- */}
      <div className="flex items-baseline gap-3 border-t border-line pt-3 mb-6">
        <span className="font-display text-2xl text-ink tabular-nums leading-none">
          {total.toLocaleString()}
        </span>
        <span className="text-xs text-muted tracking-wide">体を収蔵</span>
        <span className="ml-auto text-[11px] text-faint tracking-[0.2em] uppercase">Revealed Collection</span>
      </div>

      {/* ---- body ---- */}
      <div className="flex gap-7 items-start">
        <FilterSidebar facets={facetData} filters={filters} />
        <div className="flex-1 min-w-0">
          <GalleryGrid tokens={page} nextHref={nextHref} />
        </div>
      </div>
    </main>
  );
}
