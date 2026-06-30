"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_KEYS, DEFAULT_SORT, type SortKey } from "@/lib/filters";

const LABELS: Record<SortKey, string> = {
  "id-asc": "番号 小→大",
  "id-desc": "番号 大→小",
  character: "キャラクター",
  clan: "一族",
  total: "ステータス合計",
};

export function SortControl({ sort }: { sort: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function change(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value === DEFAULT_SORT) params.delete("sort");
    else params.set("sort", value);
    params.delete("cursor"); // any sort change returns to the first page
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative inline-flex items-center">
      {/* sort icon (left) */}
      <svg aria-hidden className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h13M4 12h9M4 17h5" />
      </svg>
      <select
        value={sort}
        onChange={(e) => change(e.target.value)}
        aria-label="並び替え"
        className="cursor-pointer appearance-none rounded-full border border-line-2 bg-surface py-1.5 pl-9 pr-8 text-xs font-bold text-muted transition hover:border-cnp-deep focus:border-cnp-deep focus:shadow-[0_0_0_3px_rgba(255,214,0,0.25)] focus:outline-none"
      >
        {SORT_KEYS.map((k) => (
          <option key={k} value={k}>{LABELS[k]}</option>
        ))}
      </select>
      {/* chevron (right) */}
      <svg aria-hidden className="pointer-events-none absolute right-3 h-3 w-3 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
