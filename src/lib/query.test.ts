import { describe, it, expect } from "vitest";
import { buildWhere, buildListQuery, buildFacetQuery } from "./query";
import type { Filters } from "./filters";

const base: Filters = { categorical: {}, stats: {}, sort: "id-asc", cursor: null };

describe("buildWhere", () => {
  it("OR within a field, AND across fields, plus stat range", () => {
    const f: Filters = { ...base,
      categorical: { character: ["Makami", "Narukami"], clan: ["Iga"] },
      stats: { katon: { min: 5, max: 9 } } };
    const { where, params } = buildWhere(f);
    expect(where).toBe(
      "WHERE character IN (?,?) AND clan IN (?) AND katon >= ? AND katon <= ?");
    expect(params).toEqual(["Makami", "Narukami", "Iga", 5, 9]);
  });
  it("returns empty clause when no filters", () => {
    expect(buildWhere(base)).toEqual({ where: "", params: [] });
  });
});

describe("buildListQuery", () => {
  it("paginates by offset (cursor) with ascending id order", () => {
    const f: Filters = { ...base, categorical: { clan: ["Iga"] }, cursor: 100 };
    const { sql, params } = buildListQuery(f, 24);
    expect(sql).toBe(
      "SELECT * FROM tokens WHERE clan IN (?) ORDER BY token_id ASC LIMIT ? OFFSET ?");
    expect(params).toEqual(["Iga", 24, 100]);
  });
  it("id-desc orders DESC; null cursor is offset 0", () => {
    const { sql, params } = buildListQuery({ ...base, sort: "id-desc" }, 24);
    expect(sql).toBe("SELECT * FROM tokens ORDER BY token_id DESC LIMIT ? OFFSET ?");
    expect(params).toEqual([24, 0]);
  });
  it("total sorts by the stat sum, character/clan by their column", () => {
    expect(buildListQuery({ ...base, sort: "total" }, 24).sql).toBe(
      "SELECT * FROM tokens ORDER BY (mokuton + katon + doton + kinton + suiton) DESC, token_id ASC LIMIT ? OFFSET ?");
    expect(buildListQuery({ ...base, sort: "character" }, 24).sql).toBe(
      "SELECT * FROM tokens ORDER BY character ASC, token_id ASC LIMIT ? OFFSET ?");
    expect(buildListQuery({ ...base, sort: "clan" }, 24).sql).toBe(
      "SELECT * FROM tokens ORDER BY clan ASC, token_id ASC LIMIT ? OFFSET ?");
  });
});

describe("buildFacetQuery", () => {
  it("counts a field excluding its own selection", () => {
    const f: Filters = { ...base, categorical: { character: ["Makami"], clan: ["Iga"] } };
    const { sql, params } = buildFacetQuery("character", f);
    expect(sql).toBe(
      "SELECT character AS value, COUNT(*) AS n FROM tokens WHERE clan IN (?) GROUP BY character ORDER BY n DESC");
    expect(params).toEqual(["Iga"]);
  });
});
