import { expect, test } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

const OLD_TO_NEW: [string, string][] = [
  ["/cadastro", "/register"],
  ["/painel", "/dashboard"],
  ["/animais", "/animals"],
  ["/animais/cows", "/animals/cows"],
  ["/plantacoes", "/crops"],
  ["/plantacoes/tomato", "/crops/tomato"],
  ["/clima", "/weather"],
  ["/perfil", "/profile"],
  ["/boas-vindas", "/welcome"],
  ["/recuperar", "/forgot-password"],
  ["/recuperar/username", "/forgot-username"],
  ["/recuperar/abc123", "/reset-password/abc123"],
  ["/confirmar/abc123", "/confirm-email/abc123"],
  ["/privacidade", "/privacy"],
  ["/termos", "/terms"],
  ["/settings", "/admin"],
  ["/settings/activity", "/admin/activity"],
  ["/settings/monitoramento", "/admin/monitoring"],
];

for (const [oldPath, newPath] of OLD_TO_NEW) {
  test(`${oldPath} redireciona (308) para ${newPath}`, async ({ page }) => {
    const res = await page.request.get(oldPath, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(new URL(res.headers()["location"], "http://x").pathname).toBe(newPath);
  });
}

test.describe("sem cookie de idioma", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/pt mostra a landing em português e / em inglês", async ({ page }) => {
    await page.goto("/pt");
    await expect(page.getByRole("link", { name: "Criar conta grátis" }).first()).toBeVisible();
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Create free account" }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test("robots.txt e sitemap.xml", async ({ page }) => {
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
  expect(await (await page.request.get("/sitemap.xml")).text()).toContain("/pt/privacy");
});

test("área logada é noindex e a landing não", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await signup(page, uniqueEmail());
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});
