import { TokenCard } from "./TokenCard";
import type { TokenRow } from "@/lib/csv";

export function GalleryGrid({ tokens }: { tokens: TokenRow[] }) {
  if (tokens.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface px-6 py-16 text-center text-sm text-muted">
        条件に一致するトークンがありません。
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {tokens.map((t, i) => (
        // staggered rise-in; cap the delay so deep pages don't crawl in
        <div key={t.token_id} className="reveal" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
          {/* eager-load the first rows so the LCP image gets fetchpriority=high */}
          <TokenCard t={t} priority={i < 8} />
        </div>
      ))}
    </div>
  );
}
