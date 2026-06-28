import { describe, it, expect } from "vitest";
import { buildWhere, buildListQuery, buildFacetQuery } from "./query";
import type { Filters } from "./filters";

const base: Filters = { categorical: {}, stats: {}, sort: "asc", cursor: null };

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
  it("adds keyset cursor and ascending order", () => {
    const f: Filters = { ...base, categorical: { clan: ["Iga"] }, cursor: 100 };
    const { sql, params } = buildListQuery(f, 24);
    expect(sql).toBe(
      "SELECT * FROM tokens WHERE clan IN (?) AND token_id > ? ORDER BY token_id ASC LIMIT ?");
    expect(params).toEqual(["Iga", 100, 24]);
  });
  it("descending uses < cursor and DESC order", () => {
    const f: Filters = { ...base, sort: "desc", cursor: 5000 };
    const { sql, params } = buildListQuery(f, 24);
    expect(sql).toBe(
      "SELECT * FROM tokens WHERE token_id < ? ORDER BY token_id DESC LIMIT ?");
    expect(params).toEqual([5000, 24]);
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
