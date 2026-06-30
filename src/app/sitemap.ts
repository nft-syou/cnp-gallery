import type { MetadataRoute } from "next";
import { allTokenIds } from "@/lib/db";

// Generated at request time (needs D1) — not baked at build, where there's no
// binding. The id list is cached, so this is one query then served from cache.
export const dynamic = "force-dynamic";

const SITE = "https://cnp-gallery.syou.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let ids: number[] = [];
  try {
    ids = await allTokenIds();
  } catch {
    ids = []; // build / D1 unavailable → fall back to the homepage entry only
  }

  const tokens: MetadataRoute.Sitemap = ids.map((id) => ({
    url: `${SITE}/token/${id}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    ...tokens,
  ];
}
