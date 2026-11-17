import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { CROP_IDS } from "@/lib/catalog";
import { cropGuidePath, cropGuidePaths, parseCropSlug } from "@/lib/crop-guide";

describe("páginas públicas 'quando plantar <cultura>'", () => {
  it("endereço com o nome da cultura na língua da página", () => {
    expect(cropGuidePaths("garlic")).toEqual({ en: "/when-to-plant/garlic", pt: "/pt/quando-plantar/alho", es: "/es/cuando-plantar/ajo" });
    expect(cropGuidePath("pt")).toBe("/pt/quando-plantar");
  });

  it("todo endereço gerado volta para a mesma cultura, em todos os idiomas", () => {
    for (const lang of LOCALES) for (const id of CROP_IDS) expect(parseCropSlug(lang, cropGuidePath(lang, id).split("/").pop()!)).toBe(id);
  });

  it("endereço de outro idioma ou inventado não existe", () => {
    expect(parseCropSlug("en", "alho")).toBeNull();
    expect(parseCropSlug("pt", "narnia")).toBeNull();
  });
});
