"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PER_PAGE_OPTIONS, DEFAULT_PER } from "@/lib/filters";

export function PerPageControl({ per }: { per: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function change(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (Number(value) === DEFAULT_PER) params.delete("per");
    else params.set("per", value);
    params.delete("cursor"); // a page-size change returns to the first page
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative inline-flex items-center">
      {/* grid icon (left) */}
      <svg aria-hidden className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      <select
        value={per}
        onChange={(e) => change(e.target.value)}
        aria-label="表示数"
        className="cursor-pointer appearance-none rounded-full border border-line-2 bg-surface py-1.5 pl-9 pr-8 text-xs font-bold text-muted transition hover:border-cnp-deep focus:border-cnp-deep focus:shadow-[0_0_0_3px_rgba(255,214,0,0.25)] focus:outline-none"
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n}件</option>
        ))}
      </select>
      {/* chevron (right) */}
      <svg aria-hidden className="pointer-events-none absolute right-3 h-3 w-3 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
