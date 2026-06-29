import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { cache } from "react";
import { getToken } from "@/lib/db";
import { toRadarData } from "@/lib/stats";
import { StatRadar } from "@/components/StatRadar";
import { RefreshButton } from "@/components/RefreshButton";
import { CATEGORICAL_FIELDS } from "@/lib/fields";

export const dynamic = "force-dynamic";

const load = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  return getToken(Number(id));
});

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
  return (
    <main className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-6">
      <Image src={t.image_url} alt={t.name} width={1024} height={1024} sizes="(max-width:768px) 100vw, 50vw" className="w-full rounded-card bg-slate-100" />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-extrabold text-xl text-cnp-ink">{t.name}</h1>
          <RefreshButton tokenId={t.token_id} />
        </div>
        <StatRadar data={toRadarData(t)} />
        <dl className="grid grid-cols-2 gap-2 mt-4 text-sm">
          {CATEGORICAL_FIELDS.map((f) => (
            <div key={f} className="rounded-lg bg-cnp-bg p-2">
              <dt className="text-[10px] uppercase text-slate-400">{f}</dt>
              <dd className="font-bold text-cnp-ink">{(t[f] as string) || "None"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
