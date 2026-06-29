"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STAT_FIELDS } from "@/lib/fields";

export function StatRangeFilter() {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("cursor");
    router.push(`${pathname}?${params.toString()}`);
  }
  return (
    <details className="border-b border-pink-100 py-2">
      <summary className="text-xs font-bold text-cnp-pink cursor-pointer">ステータス（5遁術）</summary>
      <div className="mt-1 space-y-1">
        {STAT_FIELDS.map((s) => (
          <div key={s} className="flex items-center gap-1 text-xs">
            <span className="w-16 uppercase text-slate-500">{s}</span>
            <input type="number" min={1} max={10} placeholder="min" defaultValue={sp.get(`${s}_min`) ?? ""}
              onBlur={(e) => set(`${s}_min`, e.target.value)} className="w-12 border rounded px-1" />
            <input type="number" min={1} max={10} placeholder="max" defaultValue={sp.get(`${s}_max`) ?? ""}
              onBlur={(e) => set(`${s}_max`, e.target.value)} className="w-12 border rounded px-1" />
          </div>
        ))}
      </div>
    </details>
  );
}
