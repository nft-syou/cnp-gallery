import Image from "next/image";
import Link from "next/link";
import { type TokenRow, tokenImageUrl } from "@/lib/csv";

// Clan → accent colour (the four ninja clans). Unknown/empty falls back to muted.
const CLAN_COLOR: Record<string, string> = {
  Iga: "text-iga", Koka: "text-koka", Fuma: "text-fuma", Saika: "text-saika",
};

export function TokenCard({ t, priority = false }: { t: TokenRow; priority?: boolean }) {
  if (!t.image_url) return null;
  const clan = CLAN_COLOR[t.clan] ?? "text-muted";
  return (
    <Link
      href={`/token/${t.token_id}`}
      className="group relative block overflow-hidden rounded-card border border-line bg-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-[0_20px_38px_-22px_rgba(0,0,0,0.28)]"
    >
      {/* clan accent bar, drawn on hover */}
      <span aria-hidden className={`absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-current ${clan} transition-transform duration-300 group-hover:scale-x-100`} />

      <div className="relative aspect-square overflow-hidden bg-bg-2">
        <Image
          src={tokenImageUrl(t)}
          alt={t.name}
          width={320}
          height={320}
          sizes="(max-width:640px) 50vw, 220px"
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
        <span aria-hidden className="absolute inset-0 ring-1 ring-inset ring-black/[0.04]" />
      </div>

      <div className="p-3">
        <div className="truncate font-display text-[14px] font-semibold text-ink">{t.name}</div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-muted">#{t.token_id}</span>
          {/* neutral label keeps 4.5:1 contrast; the clan hue lives in the dot */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2 py-0.5 text-[10px] font-bold text-muted">
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-current ${clan}`} />
            {t.clan || "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}
