import { TokenCard } from "./TokenCard";
import type { TokenRow } from "@/lib/csv";

export function GalleryGrid({ tokens, nextHref }: { tokens: TokenRow[]; nextHref: string | null }) {
  return (
    <div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {tokens.map((t) => <TokenCard key={t.token_id} t={t} />)}
      </div>
      {nextHref && (
        <div className="mt-6 text-center">
          <a href={nextHref} className="inline-block rounded-full bg-cnp-pink text-white font-bold px-6 py-2">もっと見る</a>
        </div>
      )}
    </div>
  );
}
