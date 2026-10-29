import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  // O servidor de desenvolvimento compila cada página na primeira visita; vários testes em paralelo
  // contra ele no Windows estouram o tempo. Um por vez e 15 s de espera deixam o resultado estável.
  workers: 1,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3100", locale: "pt-BR" },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_PATH: "data/e2e.db", WEATHER_FAKE: "1", APP_URL: "http://localhost:3100" },
  },
});
