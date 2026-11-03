import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // "server-only" falha fora do Next; nos testes ele vira um módulo vazio.
  resolve: { alias: { "server-only": path.resolve("tests/helpers/empty.ts") } },
  test: { environment: "node", include: ["tests/live/**/*.test.ts"], testTimeout: 30_000 },
});
