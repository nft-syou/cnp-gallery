import { describe, it, expect } from "vitest";
import { CATEGORICAL_FIELDS, STAT_FIELDS, CSV_TO_DB } from "./fields";

describe("fields", () => {
  it("maps CSV headers to db columns", () => {
    expect(CSV_TO_DB["WEAPON(BACK)"]).toBe("weapon_back");
    expect(CSV_TO_DB["CHARACTER"]).toBe("character");
    expect(CSV_TO_DB["MOKUTON"]).toBe("mokuton");
  });
  it("lists 9 categorical and 5 stat fields", () => {
    expect(CATEGORICAL_FIELDS).toHaveLength(9);
    expect(STAT_FIELDS).toHaveLength(5);
    expect(CATEGORICAL_FIELDS).toContain("clan");
    expect(STAT_FIELDS).toContain("katon");
  });
});
