import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Senha do admin só em variável de ambiente ou no .env.prodtest (fora do git pelo .env*; nunca vai para a Vercel).
if (existsSync(".env.prodtest")) process.loadEnvFile(".env.prodtest");

const BASE = process.env.PROD_URL ?? "https://newfarmer.app";
const host = new URL(BASE).hostname;

/**
 * Testes contra o site publicado (funcionais, API e pentest). Não apaga o banco nem a conta do admin:
 * só cria contas de teste (delivered+...@resend.dev, Stripe em modo teste) e apaga essas no fim.
 * Um teste por vez: o limite de logins é 10 a cada 15 min por rede, e o site é de verdade.
 */
export default defineConfig({
  testDir: "tests/prod",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report-prod", open: "never" }]],
  outputDir: "test-results-prod",
  use: {
    baseURL: BASE,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: {
      cookies: [
        { name: "nf_locale", value: "pt", domain: host, path: "/", expires: -1, httpOnly: false, secure: true, sameSite: "Lax" },
        { name: "nf_consent", value: "essential", domain: host, path: "/", expires: -1, httpOnly: false, secure: true, sameSite: "Lax" },
      ],
      origins: [],
    },
  },
  projects: [
    { name: "setup", testMatch: /setup\/auth\.setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /setup\/cleanup\.teardown\.ts/ },
    { name: "functional", testMatch: /functional\/.*\.spec\.ts/, dependencies: ["setup"] },
    { name: "api", testMatch: /api\/.*\.spec\.ts/, dependencies: ["setup"] },
    { name: "security", testMatch: /security\/.*\.spec\.ts/, dependencies: ["setup"] },
    // Só com PENTEST_RATELIMIT=1: bloqueia os logins desta rede por 15 minutos (inclusive o seu).
    ...(process.env.PENTEST_RATELIMIT === "1"
      ? [{ name: "ratelimit", testMatch: /ratelimit\/.*\.spec\.ts/, dependencies: ["setup", "functional", "api", "security"] }]
      : []),
  ],
});
