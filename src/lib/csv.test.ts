import { describe, it, expect } from "vitest";
import { rowToToken, isRevealed, tokenImageUrl } from "./csv";

const header = ["tokenId","name","description","image","NINJUTSU","WEAPON(BACK)","CHARACTER","CLAN","COSPLAY","ACCESSORIES(BODY)","ACCESSORIES(HEAD)","ACCESSORIES(FACE)","WEAPON(FRONT)","MOKUTON","KATON","DOTON","KINTON","SUITON"];
const revealed = ["10001","Makami #10001","desc","https://x/10001.png","Katon","Katana","Makami","Iga","Gold","None","None","None","Shuriken","3","5","7","2","9"];
const pending  = ["26667","Makami #26667","desc","https://x/reveal.gif","","","Makami","Iga","","","","","","","","","",""];

describe("csv", () => {
  it("maps a row to a token object", () => {
    const t = rowToToken(header, revealed);
    expect(t.token_id).toBe(10001);
    expect(t.weapon_back).toBe("Katana");
    expect(t.katon).toBe(5);
    expect(t.image_url).toBe("https://x/10001.png");
  });
  it("detects revealed vs pending by ninjutsu emptiness", () => {
    expect(isRevealed(rowToToken(header, revealed))).toBe(true);
    expect(isRevealed(rowToToken(header, pending))).toBe(false);
  });

  describe("tokenImageUrl", () => {
    const url = "https://data.cryptoninjapartners.com/images/1.png";
    it("appends ?v={updated_at} so a refresh busts the image cache", () => {
      expect(tokenImageUrl({ image_url: url, updated_at: 1735700000000 })).toBe(`${url}?v=1735700000000`);
    });
    it("leaves never-updated tokens (null/undefined/0) un-versioned", () => {
      expect(tokenImageUrl({ image_url: url, updated_at: null })).toBe(url);
      expect(tokenImageUrl({ image_url: url, updated_at: undefined })).toBe(url);
      expect(tokenImageUrl({ image_url: url, updated_at: 0 })).toBe(url);
    });
  });
});
