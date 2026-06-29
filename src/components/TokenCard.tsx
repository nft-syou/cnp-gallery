import Image from "next/image";
import Link from "next/link";
import type { TokenRow } from "@/lib/csv";

const CLAN_COLOR: Record<string, string> = {
  Iga: "bg-pink-100 text-pink-700", Koka: "bg-sky-100 text-sky-700",
  Fuma: "bg-violet-100 text-violet-700", Saika: "bg-amber-100 text-amber-700",
};

export function TokenCard({ t }: { t: TokenRow }) {
  return (
    <Link href={`/token/${t.token_id}`} className="block rounded-card border-2 border-pink-100 bg-white shadow-sm overflow-hidden hover:-translate-y-0.5 transition">
      <Image src={t.image_url} alt={t.name} width={320} height={320}
        sizes="(max-width:640px) 50vw, 220px" className="w-full aspect-square object-cover bg-slate-100" />
      <div className="p-2.5">
        <div className="font-bold text-sm text-cnp-ink truncate">{t.name}</div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-slate-400">#{t.token_id}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CLAN_COLOR[t.clan] ?? "bg-slate-100 text-slate-600"}`}>{t.clan}</span>
        </div>
      </div>
    </Link>
  );
}
