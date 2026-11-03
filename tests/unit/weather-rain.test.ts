import { describe, expect, it } from "vitest";
import { formatRainMm } from "@/lib/format";

describe("formatRainMm", () => {
  it("1 casa decimal no idioma da pessoa", () => {
    expect(formatRainMm(3.24, "pt")).toBe("3,2 mm");
    expect(formatRainMm(3.24, "en")).toBe("3.2 mm");
    expect(formatRainMm(5, "pt")).toBe("5,0 mm");
  });

  it("dia seco ou sem dado não mostra nada", () => {
    expect(formatRainMm(0, "pt")).toBeNull();
    expect(formatRainMm(null, "en")).toBeNull();
    expect(formatRainMm(undefined, "en")).toBeNull();
  });
});
