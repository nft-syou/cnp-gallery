import { describe, it, expect } from "vitest";
import { sourceToFields, diffUpdate } from "./sync";
import type { TokenRow } from "./csv";

const sourceJson = {
  name: "Makami #10001", image: "https://x/10001.png",
  attributes: [
    { trait_type: "CHARACTER", value: "Makami" }, { trait_type: "CLAN", value: "Koka" },
    { trait_type: "KATON", value: 6 },
  ],
};

describe("sync", () => {
  it("flattens source JSON attributes into db fields", () => {
    const f = sourceToFields(sourceJson);
    expect(f.clan).toBe("Koka");
    expect(f.katon).toBe(6);
    expect(f.image_url).toBe("https://x/10001.png");
  });
  it("produces only changed columns", () => {
    const current = { name: "Makami #10001", clan: "Iga", katon: 5, character: "Makami", image_url: "https://x/10001.png" } as TokenRow;
    const update = diffUpdate(current, sourceToFields(sourceJson));
    expect(update).toEqual({ clan: "Koka", katon: 6 });
  });
  it("returns empty object when nothing changed", () => {
    const same = { name: "Makami #10001", clan: "Koka", katon: 6, character: "Makami", image_url: "https://x/10001.png" } as TokenRow;
    expect(diffUpdate(same, sourceToFields(sourceJson))).toEqual({});
  });
  it("skips unknown trait types", () => {
    expect(sourceToFields({ attributes: [{ trait_type: "UNKNOWN", value: "x" }] })).toEqual({});
  });
  it("coerces non-numeric stat values to 0 (avoids NaN churn)", () => {
    const f = sourceToFields({ attributes: [{ trait_type: "KATON", value: "N/A" }] });
    expect(f.katon).toBe(0);
    // A 0 stat must not be flagged as changed on repeat syncs.
    expect(diffUpdate({ katon: 0 } as TokenRow, f)).toEqual({});
  });
});
