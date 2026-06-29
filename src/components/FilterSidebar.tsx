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
  return (
    <aside className="sticky top-6 max-h-[calc(100vh-3rem)] w-44 flex-none overflow-auto rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur-sm md:w-52">
      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-faint">絞り込み · Filter</div>
      {CATEGORICAL_FIELDS.map((field) => (
        <FacetGroup key={field} field={field} label={LABEL[field]}
          facets={facets[field]} selected={filters.categorical[field] ?? []} />
      ))}
      <StatRangeFilter />
    </aside>
  );
}
