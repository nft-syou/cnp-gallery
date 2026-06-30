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
    <details className="group border-b border-line py-2.5" open>
      <summary className="flex cursor-pointer items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {selected.length > 0 && (
            <span className="rounded-full bg-cnp px-1.5 text-[9px] font-bold leading-[14px] text-on-cnp">{selected.length}</span>
          )}
        </span>
        <span aria-hidden className="text-faint transition-transform duration-200 group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 max-h-52 space-y-0.5 overflow-auto pr-1">
        {facets.map((f) => {
          const on = selected.includes(f.value);
          return (
            <label key={f.value}
              className={`flex cursor-pointer items-center gap-2 py-1 text-xs transition-colors ${on ? "font-medium text-ink" : "text-muted hover:text-ink"}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(f.value)} />
              <span className="truncate">{f.value}</span>
              <span className="ml-auto text-[10px] tabular-nums text-muted">{f.n.toLocaleString()}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
