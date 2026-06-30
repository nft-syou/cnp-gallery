"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STAT_FIELDS } from "@/lib/fields";

// The five stats in their elemental colours.
const ELEMENT: Record<string, string> = {
  mokuton: "text-mokuton", katon: "text-katon", doton: "text-doton",
  kinton: "text-kinton", suiton: "text-suiton",
};

export function StatRangeFilter() {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  }
  return (
    <details key={sp.toString()} className="group border-b border-line py-2.5">
      <summary className="flex cursor-pointer items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink">
        ステータス
        <span aria-hidden className="text-faint transition-transform duration-200 group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2.5 space-y-1.5">
        {STAT_FIELDS.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <span className={`w-12 text-[10px] font-bold uppercase tracking-wide ${ELEMENT[s] ?? "text-muted"}`}>{s}</span>
            <input type="number" min={1} max={10} placeholder="min" defaultValue={sp.get(`${s}_min`) ?? ""}
              onBlur={(e) => set(`${s}_min`, e.target.value)} className="w-10 px-1.5 py-1 text-center text-[11px] tabular-nums" />
            <span aria-hidden className="text-faint">–</span>
            <input type="number" min={1} max={10} placeholder="max" defaultValue={sp.get(`${s}_max`) ?? ""}
              onBlur={(e) => set(`${s}_max`, e.target.value)} className="w-10 px-1.5 py-1 text-center text-[11px] tabular-nums" />
          </div>
        ))}
      </div>
    </details>
  );
}
