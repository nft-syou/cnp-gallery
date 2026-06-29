import Image from "next/image";
import Link from "next/link";
import type { TokenRow } from "@/lib/csv";

// Clan → accent colour (the four ninja clans). Unknown/empty falls back to muted.
const CLAN_COLOR: Record<string, string> = {
  Iga: "text-iga", Koka: "text-koka", Fuma: "text-fuma", Saika: "text-saika",
};

export function TokenCard({ t }: { t: TokenRow }) {
  if (!t.image_url) return null;
  const clan = CLAN_COLOR[t.clan] ?? "text-muted";
  return (
    <Link
      href={`/token/${t.token_id}`}
      className="group relative block overflow-hidden rounded-card border border-line bg-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-[0_22px_44px_-22px_rgba(0,0,0,0.85)]"
    >
      {/* clan accent hairline, drawn on hover */}
      <span aria-hidden className={`absolute inset-x-0 top-0 z-10 h-px origin-left scale-x-0 bg-current ${clan} transition-transform duration-300 group-hover:scale-x-100`} />

      <div className="relative aspect-square overflow-hidden bg-bg-2">
        <Image
          src={t.image_url}
          alt={t.name}
          width={320}
          height={320}
          sizes="(max-width:640px) 50vw, 220px"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
        <span aria-hidden className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
      </div>

      <div className="p-3">
        <div className="truncate font-display text-[15px] leading-tight text-ink">{t.name}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-faint">#{t.token_id}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2 py-0.5 text-[10px] font-medium ${clan}`}>
            <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
            {t.clan || "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}
