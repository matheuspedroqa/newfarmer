import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // "server-only" falha fora do Next; nos testes ele vira um módulo vazio.
  resolve: { alias: { "server-only": path.resolve("tests/helpers/empty.ts") } },
  test: {
    environment: "node",
    // O primeiro teste de cada arquivo abre o Postgres em memória (PGlite), o que leva alguns segundos.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
