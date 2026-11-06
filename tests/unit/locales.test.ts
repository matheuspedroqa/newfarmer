import { describe, expect, it } from "vitest";
import { browserLocale, resolveLocale, resolveTheme } from "@/i18n/locales";

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

describe("browserLocale", () => {
  it("pega o idioma do navegador que o site tem, na ordem de preferência", () => {
    expect(browserLocale("pt-BR,pt;q=0.9,en-US;q=0.8")).toBe("pt");
    expect(browserLocale("es-MX")).toBe("es");
    expect(browserLocale("fr-FR,fr;q=0.9,es;q=0.8,en;q=0.7")).toBe("es");
    expect(browserLocale("en;q=0.5,pt;q=0.9")).toBe("pt");
    expect(browserLocale("PT-pt")).toBe("pt");
  });

  it("nenhum idioma do site, peso zero ou cabeçalho vazio: null", () => {
    expect(browserLocale("de-DE,fr;q=0.9")).toBeNull();
    expect(browserLocale("pt;q=0")).toBeNull();
    expect(browserLocale("")).toBeNull();
    expect(browserLocale(null)).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("claro é o padrão", () => {
    expect(resolveTheme(undefined)).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });
});
