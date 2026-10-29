import { describe, expect, it } from "vitest";
import { KNOWLEDGE_COUNTRIES, knowledgeCountry } from "@/lib/countries";

describe("países da base de conhecimento", () => {
  it("são Brasil e os 8 países pedidos", () => {
    expect(KNOWLEDGE_COUNTRIES).toEqual(["BR", "US", "CA", "DE", "ES", "FR", "PT", "IT", "MX"]);
  });

  it("reconhece o país do cadastro (código em maiúsculas ou minúsculas)", () => {
    expect(knowledgeCountry("pt")).toBe("PT");
    expect(knowledgeCountry("BR")).toBe("BR");
    expect(knowledgeCountry("JP")).toBeNull();
  });
});
