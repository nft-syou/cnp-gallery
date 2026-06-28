import { describe, it, expect } from "vitest";
import { parseFilters } from "./filters";

describe("parseFilters", () => {
  it("parses comma lists, stat ranges, sort, cursor", () => {
    const f = parseFilters({
      character: "Makami,Narukami", clan: "Iga",
      katon_min: "5", katon_max: "9", sort: "desc", cursor: "12000",
    });
    expect(f.categorical.character).toEqual(["Makami", "Narukami"]);
    expect(f.categorical.clan).toEqual(["Iga"]);
    expect(f.stats.katon).toEqual({ min: 5, max: 9 });
    expect(f.sort).toBe("desc");
    expect(f.cursor).toBe(12000);
  });
  it("defaults sort asc and ignores unknown fields", () => {
    const f = parseFilters({ bogus: "x" });
    expect(f.sort).toBe("asc");
    expect(Object.keys(f.categorical)).toHaveLength(0);
    expect(f.cursor).toBeNull();
  });
});
