import { describe, expect, it } from "vitest";
import { resolveLocale, resolveTheme } from "@/i18n/locales";

describe("resolveLocale", () => {
  it("inglês é o padrão quando não há escolha ou ela é inválida", () => {
    expect(resolveLocale(undefined)).toBe("en");
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale("fr")).toBe("en");
  });

  it("respeita a escolha de português, inglês ou espanhol", () => {
    expect(resolveLocale("pt")).toBe("pt");
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("es")).toBe("es");
  });
});

describe("resolveTheme", () => {
  it("claro é o padrão", () => {
    expect(resolveTheme(undefined)).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
});
