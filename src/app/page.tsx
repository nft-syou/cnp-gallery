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
    <main className="max-w-6xl mx-auto p-4">
      <header className="flex items-center gap-3 mb-4">
        <h1 className="font-extrabold text-cnp-pink text-xl">CNP <span className="text-cnp-blue">Gallery</span></h1>
        <form action="/token" className="ml-auto">
          <label htmlFor="token-search" className="sr-only">token ID検索</label>
          <input id="token-search" name="id" placeholder="🔍 token IDで検索" className="rounded-full border-2 border-pink-100 px-3 py-1.5 text-sm" />
        </form>
      </header>
      <div className="text-xs text-slate-400 mb-2">{total.toLocaleString()} 件</div>
      <div className="flex gap-4">
        <FilterSidebar facets={facetData} filters={filters} />
        <div className="flex-1"><GalleryGrid tokens={page} nextHref={nextHref} /></div>
      </div>
    </main>
  );
}
