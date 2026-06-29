"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Facet } from "@/lib/db";

export function FacetGroup({ field, label, facets, selected }:
  { field: string; label: string; facets: Facet[]; selected: string[] }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();

  function toggle(value: string) {
    const set = new Set(selected);
    if (set.has(value)) set.delete(value); else set.add(value);
    const params = new URLSearchParams(sp.toString());
    if (set.size) params.set(field, [...set].join(",")); else params.delete(field);
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <details className="border-b border-pink-100 py-2" open>
      <summary className="text-xs font-bold text-cnp-pink cursor-pointer">{label}</summary>
      <div className="mt-1 max-h-48 overflow-auto">
        {facets.map((f) => (
          <label key={f.value} className="flex items-center gap-1.5 text-xs text-slate-600 py-0.5">
            <input type="checkbox" checked={selected.includes(f.value)} onChange={() => toggle(f.value)} />
            <span className="truncate">{f.value}</span>
            <span className="ml-auto text-[10px] text-slate-400">{f.n.toLocaleString()}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
