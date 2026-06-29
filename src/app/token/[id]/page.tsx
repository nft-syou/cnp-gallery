import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { getToken } from "@/lib/db";
import { toRadarData } from "@/lib/stats";
import { StatRadar } from "@/components/StatRadar";
import { RefreshButton } from "@/components/RefreshButton";
import { CATEGORICAL_FIELDS } from "@/lib/fields";

// No `force-dynamic` and no generateStaticParams: this route renders on-demand
// the first time an id is requested, then the result is cached and served from
// the edge incremental cache. The `getToken` read is tagged `token:{id}`, so a
// refresh of that token busts exactly this page via revalidateTag (speed-first).
const load = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  return getToken(Number(id));
});

const CLAN_COLOR: Record<string, string> = {
  Iga: "text-iga", Koka: "text-koka", Fuma: "text-fuma", Saika: "text-saika",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await load((await params).id);
  if (!t) return { title: "Not found | CNP Gallery" };
  return {
    title: `${t.name} | CNP Gallery`,
    // OGP crawlers fetch the origin URL directly; the CF image loader is client-side only
    openGraph: { title: t.name, images: [t.image_url] },
    twitter: { card: "summary_large_image", title: t.name, images: [t.image_url] },
  };
}

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await load(id);
  if (!t) notFound();
  const clan = CLAN_COLOR[t.clan] ?? "text-muted";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted transition-colors hover:text-ink">
        <span aria-hidden>←</span> ギャラリーへ戻る
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-2">
        {/* artwork */}
        <div className="reveal overflow-hidden rounded-card border border-line bg-bg-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
          <Image src={t.image_url} alt={t.name} width={1024} height={1024}
            sizes="(max-width:768px) 100vw, 50vw"
            className="aspect-square w-full object-cover" />
        </div>

        {/* dossier */}
        <div className="reveal" style={{ animationDelay: "70ms" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-0.5 text-[11px] font-medium ${clan}`}>
                <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
                {t.clan || "—"} 一族
              </span>
              <h1 className="mt-2.5 font-display text-[28px] leading-tight text-ink">{t.name}</h1>
              <p className="mt-1 text-xs tabular-nums tracking-wide text-faint">TOKEN #{t.token_id}</p>
            </div>
            <RefreshButton tokenId={t.token_id} />
          </div>

          {/* 5 遁術 radar */}
          <section className="mt-6 rounded-2xl border border-line bg-surface/50 p-4">
            <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-faint">五遁術 · Ninjutsu</div>
            <StatRadar data={toRadarData(t)} />
          </section>

          {/* traits */}
          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {CATEGORICAL_FIELDS.map((f) => {
              const value = (t[f] as string) || "";
              return (
                <div key={f} className="bg-surface px-3 py-2.5">
                  <dt className="text-[9.5px] uppercase tracking-[0.12em] text-faint">{f.replace(/_/g, " · ")}</dt>
                  <dd className={`mt-0.5 truncate text-sm font-medium ${value ? "text-ink" : "text-faint"}`}>{value || "なし"}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </main>
  );
}
