import Link from "next/link";

// First / last page always shown; a small window around the current page; the
// rest collapsed to "…". e.g. current 7 of 463 → 1 … 6 7 8 … 463
function pageWindow(current: number, total: number): (number | "gap")[] {
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
  const out: (number | "gap")[] = [1];
  if (range.length && range[0] > 2) out.push("gap");
  out.push(...range);
  if (range.length && range[range.length - 1] < total - 1) out.push("gap");
  if (total > 1) out.push(total);
  return out;
}

const CELL = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-bold tabular-nums transition-colors";
const LINK = "border border-line text-muted hover:border-cnp-deep hover:bg-cnp/20 hover:text-ink";

function Arrow({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const base = "inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none font-bold transition-colors";
  return disabled
    ? <span aria-hidden className={`${base} text-faint opacity-40`}>{children}</span>
    : <Link href={href} aria-label={label} className={`${base} ${LINK}`}>{children}</Link>;
}

export function Pagination({ currentPage, totalPages, hrefFor }: {
  currentPage: number;
  totalPages: number;
  hrefFor: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="ページ送り" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      <Arrow href={hrefFor(currentPage - 1)} disabled={currentPage <= 1} label="前のページ">‹</Arrow>
      {pageWindow(currentPage, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-faint">…</span>
        ) : p === currentPage ? (
          <span key={p} aria-current="page" className={`${CELL} bg-cnp text-on-cnp`}>{p}</span>
        ) : (
          <Link key={p} href={hrefFor(p)} aria-label={`${p} ページ目`} className={`${CELL} ${LINK}`}>{p}</Link>
        ),
      )}
      <Arrow href={hrefFor(currentPage + 1)} disabled={currentPage >= totalPages} label="次のページ">›</Arrow>
    </nav>
  );
}
