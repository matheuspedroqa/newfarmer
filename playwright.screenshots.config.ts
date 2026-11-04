import { defineConfig } from "@playwright/test";

// Porta e banco próprios: não colide com a suíte e2e (3100, data/e2e-pglite).
export default defineConfig({
  testDir: "tests/screenshots",
  timeout: 540_000,
  workers: 1,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3200",
    locale: "pt-BR",
    // O cadastro é feito em português (os helpers do e2e); o aviso de cookies já vem fechado.
    storageState: {
      cookies: ["nf_locale=pt", "nf_consent=essential"].map((c) => ({ name: c.split("=")[0], value: c.split("=")[1], domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const })),
      origins: [],
    },
  },
  webServer: {
    command: "node -e \"require('fs').rmSync('data/screenshots-pglite',{recursive:true,force:true})\" && npm run dev -- -p 3200",
    url: "http://localhost:3200/login",
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: "", DATABASE_PATH: "data/screenshots-pglite", WEATHER_FAKE: "1", STRIPE_FAKE: "1", APP_URL: "http://localhost:3200", E2E: "1" },
  },
});
