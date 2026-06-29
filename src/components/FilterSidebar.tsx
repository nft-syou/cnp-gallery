import { FacetGroup } from "./FacetGroup";
import { StatRangeFilter } from "./StatRangeFilter";
import { CATEGORICAL_FIELDS, type CategoricalField } from "@/lib/fields";
import type { Facet } from "@/lib/db";
import type { Filters } from "@/lib/filters";

const LABEL: Record<CategoricalField, string> = {
  character: "CHARACTER", clan: "CLAN", ninjutsu: "NINJUTSU", weapon_back: "WEAPON (BACK)",
  weapon_front: "WEAPON (FRONT)", cosplay: "COSPLAY", acc_body: "ACCESSORIES (BODY)",
  acc_head: "ACCESSORIES (HEAD)", acc_face: "ACCESSORIES (FACE)",
};

export function FilterSidebar({ facets, filters }:
  { facets: Record<CategoricalField, Facet[]>; filters: Filters }) {
  return (
    <aside className="w-44 flex-none rounded-2xl border-2 border-pink-100 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold mb-1">フィルター</div>
      {CATEGORICAL_FIELDS.map((field) => (
        <FacetGroup key={field} field={field} label={LABEL[field]}
          facets={facets[field]} selected={filters.categorical[field] ?? []} />
      ))}
      <StatRangeFilter />
    </aside>
  );
}
