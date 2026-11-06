import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { KNOWLEDGE_COUNTRIES } from "@/lib/countries";
import { guidePath, guidePaths, parseGuide, todayGuidePath } from "@/lib/plant-guide";

describe("páginas públicas 'o que plantar'", () => {
  it("endereço na língua da página", () => {
    expect(guidePaths("BR", 3)).toEqual({ en: "/what-to-plant/brazil/march", pt: "/pt/o-que-plantar/brasil/marco", es: "/es/que-plantar/brasil/marzo" });
    expect(guidePath("pt")).toBe("/pt/o-que-plantar");
  });

  it("todo endereço gerado volta para o mesmo país e mês, em todos os idiomas", () => {
    for (const lang of LOCALES)
      for (const country of KNOWLEDGE_COUNTRIES)
        for (let month = 1; month <= 12; month++) {
          const [c, m] = guidePath(lang, country, month).split("/").slice(-2);
          expect(parseGuide(lang, c, m)).toEqual({ country, month });
        }
  });

  it("endereço de outro idioma ou inventado não existe", () => {
    expect(parseGuide("pt", "brazil", "march")).toBeNull();
    expect(parseGuide("en", "brazil", "marco")).toBeNull();
    expect(parseGuide("en", "narnia", "march")).toBeNull();
  });

  it("/how-to-plant-today manda para o país no mês de agora (UTC), na língua do visitante", () => {
    const now = new Date(Date.UTC(2026, 10, 30, 23, 30));
    expect(todayGuidePath("pt", "ES", now)).toBe("/pt/o-que-plantar/espanha/novembro");
    expect(todayGuidePath("en", "br", now)).toBe("/what-to-plant/brazil/november");
    expect(todayGuidePath("es", "MX", new Date(Date.UTC(2027, 0, 1)))).toBe("/es/que-plantar/mexico/enero");
    expect(todayGuidePath("en", "AR", now)).toBeNull();
    expect(todayGuidePath("en", "", now)).toBeNull();
  });
});
