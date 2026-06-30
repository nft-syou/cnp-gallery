import { describe, it, expect } from "vitest";
import { parseFilters } from "./filters";

describe("parseFilters", () => {
  it("parses comma lists, stat ranges, sort, cursor (offset)", () => {
    const f = parseFilters({
      character: "Makami,Narukami", clan: "Iga",
      katon_min: "5", katon_max: "9", sort: "total", cursor: "12000",
    });
    expect(f.categorical.character).toEqual(["Makami", "Narukami"]);
    expect(f.categorical.clan).toEqual(["Iga"]);
    expect(f.stats.katon).toEqual({ min: 5, max: 9 });
    expect(f.sort).toBe("total");
    expect(f.cursor).toBe(12000);
  });
  it("accepts every known sort key and defaults unknown to id-asc", () => {
    for (const s of ["id-asc", "id-desc", "character", "clan", "total"]) {
      expect(parseFilters({ sort: s }).sort).toBe(s);
    }
    expect(parseFilters({ sort: "desc" }).sort).toBe("id-asc"); // legacy/invalid → default
    expect(parseFilters({ bogus: "x" }).sort).toBe("id-asc");
    expect(parseFilters({ bogus: "x" }).cursor).toBeNull();
  });
});
