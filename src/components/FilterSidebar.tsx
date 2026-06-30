"use client";
import { useEffect, useState } from "react";
import { FacetGroup } from "./FacetGroup";
import { StatRangeFilter } from "./StatRangeFilter";
import { CATEGORICAL_FIELDS, type CategoricalField } from "@/lib/fields";
import type { Facet } from "@/lib/db";
import type { Filters } from "@/lib/filters";

const LABEL: Record<CategoricalField, string> = {
  character: "CHARACTER", clan: "CLAN", ninjutsu: "NINJUTSU", weapon_back: "WEAPON / BACK",
  weapon_front: "WEAPON / FRONT", cosplay: "COSPLAY", acc_body: "ACC / BODY",
  acc_head: "ACC / HEAD", acc_face: "ACC / FACE",
};

export function FilterSidebar({ facets, filters }:
  { facets: Record<CategoricalField, Facet[]>; filters: Filters }) {
  const [open, setOpen] = useState(false);

  // lock background scroll while the mobile drawer is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const activeCount =
    Object.values(filters.categorical).reduce((n, arr) => n + (arr?.length ?? 0), 0) +
    Object.keys(filters.stats).length;

  const groups = (
    <>
      {CATEGORICAL_FIELDS.map((field) => (
        <FacetGroup key={field} field={field} label={LABEL[field]}
          facets={facets[field]} selected={filters.categorical[field] ?? []} />
      ))}
      <StatRangeFilter />
    </>
  );

  return (
    <>
      {/* ≥ md: sticky sidebar */}
      <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-44 flex-none overflow-auto rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm md:block md:w-52">
        <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-muted">絞り込み · Filter</div>
        {groups}
      </aside>

      {/* < md: floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-cnp px-5 py-2.5 text-sm font-bold text-on-cnp shadow-[0_14px_34px_-10px_rgba(255,202,0,0.95)] md:hidden"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
          <path d="M3 5h18l-7 8v6l-4 2v-8z" />
        </svg>
        絞り込み
        {activeCount > 0 && (
          <span className="rounded-full bg-on-cnp px-1.5 text-[10px] font-bold leading-[16px] text-cnp">{activeCount}</span>
        )}
      </button>

      {/* < md: drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="絞り込み">
          <div className="drawer-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="drawer-panel absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col border-r border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted">絞り込み · Filter</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="閉じる"
                className="text-lg leading-none text-muted transition-colors hover:text-ink">✕</button>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4 pt-1">{groups}</div>
            <div className="border-t border-line p-3">
              <button type="button" onClick={() => setOpen(false)}
                className="w-full rounded-full bg-cnp py-2.5 text-sm font-bold text-on-cnp transition hover:bg-cnp-deep">
                結果を見る
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
