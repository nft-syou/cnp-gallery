import Image from "next/image";
import Link from "next/link";
import { parseFilters } from "@/lib/filters";
import { listTokens, facets, totalCount } from "@/lib/db";
import { GalleryGrid } from "@/components/GalleryGrid";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      {/* the logo is the mobile LCP — preload it at high priority (React 19 hoists this to <head>) */}
      <link rel="preload" as="image" href="/logo.png" fetchPriority="high" />
      {/* ---- masthead ---- */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-7">
        <h1 className="flex items-center">
          {/* logo doubles as a "reset" — links to the bare gallery URL, clearing every filter */}
          <Link href="/" aria-label="CNP Gallery トップ（絞り込みを解除）" className="inline-flex rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cnp-deep">
            {/* one file for both themes — recoloured to near-white in dark via a filter,
                so the off-theme variant is never downloaded (was shipping a hidden 2nd logo) */}
            <Image src="/logo.png" alt="CNP Gallery" width={480} height={159} loading="eager" unoptimized className="h-9 w-auto sm:h-11 dark:brightness-0 dark:invert" />
          </Link>
        </h1>

        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <form action="/token" className="relative flex-1 sm:flex-none">
            <label htmlFor="token-search" className="sr-only">token ID で検索</label>
            <span aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">⌕</span>
            <input
              id="token-search"
              name="id"
              inputMode="numeric"
              placeholder="token ID を入力"
              className="w-full rounded-full border border-line-2 bg-surface py-2 pl-9 pr-4 text-sm text-ink transition focus:border-cnp-deep focus:shadow-[0_0_0_3px_rgba(255,214,0,0.25)] focus:outline-none sm:w-56"
            />
          </form>
          <ThemeToggle />
        </div>
      </header>

      {/* ---- count rule ---- */}
      <div className="mb-6 flex items-baseline gap-3 border-t border-line pt-3">
        <span className="font-display text-2xl font-black leading-none tabular-nums text-ink">
          {total.toLocaleString()}
        </span>
        <span className="text-xs text-muted">体を収蔵</span>
        <span className="ml-auto text-[11px] uppercase tracking-[0.2em] text-muted">Revealed Collection</span>
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
