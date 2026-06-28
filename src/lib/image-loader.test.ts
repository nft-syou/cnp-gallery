import { describe, it, expect } from "vitest";
import cfLoader from "./image-loader";

describe("cfLoader", () => {
  it("builds a /cdn-cgi/image URL with width, quality, format", () => {
    const url = cfLoader({ src: "https://data.cryptoninjapartners.com/images/1.png", width: 240, quality: 70 });
    expect(url).toBe("/cdn-cgi/image/width=240,quality=70,format=auto/https://data.cryptoninjapartners.com/images/1.png");
  });
  it("defaults quality to 75", () => {
    const url = cfLoader({ src: "https://x/2.png", width: 320 });
    expect(url).toBe("/cdn-cgi/image/width=320,quality=75,format=auto/https://x/2.png");
  });
});
