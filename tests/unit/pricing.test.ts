import { describe, expect, it } from "vitest";
import { currencyForCountry, formatPrice } from "@/lib/pricing";

const nbsp = (s: string) => s.replace(/\s/g, " ");

describe("preço por país", () => {
  it("BR em reais, Europa em euro, resto em dólar", () => {
    expect(currencyForCountry("BR")).toBe("brl");
    for (const c of ["PT", "DE", "GB", "pt"]) expect(currencyForCountry(c)).toBe("eur");
    for (const c of ["US", "AR", null, undefined, ""]) expect(currencyForCountry(c)).toBe("usd");
  });
  it("formata", () => {
    expect(nbsp(formatPrice("brl", "pt"))).toBe("R$ 6,99");
    expect(formatPrice("eur", "en")).toBe("€1.99");
    expect(formatPrice("usd", "en")).toBe("$2.00");
  });
});
