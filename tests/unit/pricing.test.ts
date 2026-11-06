import { describe, expect, it } from "vitest";
import { currencyForCountry, formatMoney, formatPrice } from "@/lib/pricing";

const nbsp = (s: string) => s.replace(/\s/g, " ");

describe("preço por país", () => {
  it("BR em reais, Europa em euro, resto em dólar", () => {
    expect(currencyForCountry("BR")).toBe("brl");
    for (const c of ["PT", "DE", "GB", "pt"]) expect(currencyForCountry(c)).toBe("eur");
    for (const c of ["US", "AR", null, undefined, ""]) expect(currencyForCountry(c)).toBe("usd");
  });
  it("formata valores quaisquer", () => {
    expect(nbsp(formatMoney("brl", 123456, "pt"))).toBe("R$ 1.234,56");
    expect(formatMoney("usd", 0, "en")).toBe("$0.00");
  });
  it("formata", () => {
    expect(nbsp(formatPrice("brl", "pt"))).toBe("R$ 7,99");
    expect(formatPrice("eur", "en")).toBe("€2.99");
    expect(formatPrice("usd", "en")).toBe("$2.99");
  });
});
