import { describe, it, expect } from "vitest";
import { parseFilters, parsePerPage } from "./filters";

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
  it("parsePerPage only accepts whitelisted sizes", () => {
    expect(parsePerPage({ per: "24" })).toBe(24);
    expect(parsePerPage({ per: "96" })).toBe(96);
    expect(parsePerPage({ per: "1000" })).toBe(48); // off-list → default
    expect(parsePerPage({})).toBe(48);
  });
});
