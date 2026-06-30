import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { getToken } from "@/lib/db";
import { tokenImageUrl } from "@/lib/csv";
import { toRadarData } from "@/lib/stats";
import { StatRadar } from "@/components/StatRadar";
import { RefreshButton } from "@/components/RefreshButton";
import { BackLink } from "@/components/BackLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { CATEGORICAL_FIELDS } from "@/lib/fields";

// CNP collection on OpenSea (Ethereum). `/item/ethereum/{contract}/{tokenId}`.
const OPENSEA_ITEM = "https://opensea.io/item/ethereum/0x138a5c693279b6cd82f48d4bef563251bc15adce";

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
    description: `${t.name}（CLAN: ${t.clan || "—"}）— CNP Gallery で CryptoNinja Partners #${t.token_id} のトレイトと5遁術ステータスを見る。`,
    alternates: { canonical: `/token/${t.token_id}` },
    // OGP crawlers fetch the origin URL directly; the CF image loader is client-side only
    openGraph: {
      type: "article",
      title: t.name,
      description: `CryptoNinja Partners #${t.token_id} · CLAN ${t.clan || "—"}`,
      url: `/token/${t.token_id}`,
      images: [{ url: tokenImageUrl(t), width: 1000, height: 1000, alt: t.name }],
    },
    twitter: { card: "summary_large_image", title: t.name, images: [tokenImageUrl(t)] },
  };
}

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await load(id);
  if (!t) notFound();
  const clan = CLAN_COLOR[t.clan] ?? "text-muted";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-6">
      {/* top bar: the logo returns to the unfiltered gallery; theme toggle */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="CNP Gallery トップ（絞り込みを解除）" className="inline-flex rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cnp-deep">
          <Logo sizes="(min-width: 640px) 109px, 97px" className="h-8 w-auto sm:h-9 dark:brightness-0 dark:invert" />
        </Link>
        <ThemeToggle />
      </div>

      <BackLink className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted transition-colors hover:text-ink">
        <span aria-hidden>←</span> ギャラリーへ戻る
      </BackLink>

      <div className="mt-4 grid items-start gap-8 md:grid-cols-2">
        {/* artwork */}
        <div className="reveal overflow-hidden rounded-card border border-line bg-surface shadow-[0_34px_64px_-34px_rgba(0,0,0,0.3)]">
          <Image src={tokenImageUrl(t)} alt={t.name} width={1024} height={1024}
            sizes="(max-width:768px) 100vw, 50vw"
            className="block aspect-square w-full object-cover" />
        </div>

        {/* dossier */}
        <div className="reveal" style={{ animationDelay: "70ms" }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-bold text-muted">
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-current ${clan}`} />
            {t.clan || "—"}
          </span>
          <h1 className="mt-2.5 font-display text-[26px] font-black leading-tight text-ink">
            <span className="marker">{t.name}</span>
          </h1>
          <p className="mt-1.5 text-xs font-medium tabular-nums tracking-wide text-faint">TOKEN #{t.token_id}</p>

          {/* actions: marketplace (primary) + original image + metadata refresh */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={`${OPENSEA_ITEM}/${t.token_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2081e2] px-4 py-1.5 text-xs font-bold text-white shadow-[0_8px_20px_-8px_rgba(32,129,226,0.9)] transition hover:bg-[#1868b7]"
            >
              OpenSea で見る
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </a>
            <a
              href={`/api/tokens/${t.token_id}/image`}
              download={`cnp-${t.token_id}.png`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-cnp-deep hover:bg-cnp/25 hover:text-ink"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
              </svg>
              画像
            </a>
            <RefreshButton tokenId={t.token_id} />
          </div>

          {/* 5 遁術 radar */}
          <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <StatRadar data={toRadarData(t)} />
          </section>

          {/* traits */}
          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {CATEGORICAL_FIELDS.map((f) => {
              const value = (t[f] as string) || "";
              return (
                <div key={f} className="bg-surface px-3 py-2.5">
                  <dt className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-faint">{f.replace(/_/g, " · ")}</dt>
                  <dd className={`mt-0.5 truncate text-sm font-semibold ${value ? "text-ink" : "text-faint"}`}>{value || "なし"}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </main>
  );
}
