import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// O @swc/core 1.16 recusa carregar no Windows quando a raiz C:\ dá permissões a contêineres de app;
// por isso package.json fixa @swc/core em 1.15.x via "overrides". Este teste falha se isso voltar.
describe("dependências do build", () => {
  it("o plugin do next-intl carrega (usado pelo next.config.ts)", () => {
    const require = createRequire(import.meta.url);
    expect(() => require("next-intl/plugin")).not.toThrow();
  });
});
