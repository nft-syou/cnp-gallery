import { TokenCard } from "./TokenCard";
import type { TokenRow } from "@/lib/csv";

export function GalleryGrid({ tokens, nextHref }: { tokens: TokenRow[]; nextHref: string | null }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {tokens.map((t, i) => (
          // staggered rise-in; cap the delay so deep pages don't crawl in
          <div key={t.token_id} className="reveal" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
            <TokenCard t={t} />
          </div>
        ))}
      </div>

      {nextHref && (
        <div className="mt-10 text-center">
          <a
            href={nextHref}
            className="group inline-flex items-center gap-2 rounded-full bg-cnp px-8 py-3 text-sm font-bold text-ink shadow-[0_12px_26px_-12px_rgba(255,202,0,0.95)] transition hover:-translate-y-0.5 hover:bg-cnp-deep"
          >
            もっと見る
            <span aria-hidden className="transition group-hover:translate-y-0.5">↓</span>
          </a>
        </div>
      )}
    </div>
  );
}
