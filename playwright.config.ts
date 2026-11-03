import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  // O servidor de desenvolvimento compila cada página na primeira visita; vários testes em paralelo
  // contra ele no Windows estouram o tempo. Um por vez e 15 s de espera deixam o resultado estável.
  workers: 1,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3100",
    locale: "pt-BR",
    // O padrão do site é inglês; os robôs conferem os textos em português.
    storageState: {
      cookies: [
        { name: "nf_locale", value: "pt", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
        { name: "nf_cookie_notice", value: "1", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
      ],
      origins: [],
    },
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 180_000,
    // DATABASE_URL vazio: o robô nunca usa o Supabase de verdade, mesmo com .env.local no computador.
    env: { DATABASE_URL: "", DATABASE_PATH: "data/e2e-pglite", WEATHER_FAKE: "1", APP_URL: "http://localhost:3100" },
  },
});
