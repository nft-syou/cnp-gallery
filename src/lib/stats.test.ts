import { describe, it, expect } from "vitest";
import { toRadarData } from "./stats";
import type { TokenRow } from "./csv";

describe("toRadarData", () => {
  it("maps the five stats into recharts rows", () => {
    const t = { mokuton: 3, katon: 5, doton: 7, kinton: 2, suiton: 9 } as TokenRow;
    expect(toRadarData(t)).toEqual([
      { stat: "MOKUTON", value: 3 }, { stat: "KATON", value: 5 },
      { stat: "DOTON", value: 7 }, { stat: "KINTON", value: 2 },
      { stat: "SUITON", value: 9 },
    ]);
  });
});
