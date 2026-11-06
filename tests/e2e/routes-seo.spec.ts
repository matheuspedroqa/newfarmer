import { expect, test } from "@playwright/test";
import { createAccount, signup, uniqueEmail, subscribeFake } from "./helpers";

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

  test("/pt mostra a landing em português e / em inglês", async ({ page, context }) => {
    await page.goto("/pt");
    await expect(page.getByRole("link", { name: "Assinar", exact: true }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    expect((await context.cookies()).find((c) => c.name === "nf_locale")?.value).toBe("pt");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pt$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    for (const [path, heading] of [["/pt/privacy", "Política de Privacidade"], ["/pt/terms", "Termos de Uso"]]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    }
    await context.clearCookies();
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Subscribe", exact: true }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/localhost:3100\/?$/);
    await expect(page.locator('link[rel="alternate"][hreflang="pt"]')).toHaveCount(1);
  });

  test("o seletor de idioma troca de URL nas páginas de marketing", async ({ page }) => {
    await page.goto("/pt/privacy");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("top-controls").getByRole("button", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("top-controls").getByRole("button", { name: "PT", exact: true }).click();
    await expect(page).toHaveURL(/\/pt\/privacy$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await page.goto("/pt");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("top-controls").getByRole("button", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForLoadState("networkidle");
    await page.getByTestId("top-controls").getByRole("button", { name: "PT", exact: true }).click();
    await expect(page).toHaveURL(/\/pt$/);
  });

  test("espanhol em /es e páginas públicas 'o que plantar' com endereço na língua da página", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tus animales y tu huerta, organizados para tu clima");
    await page.goto("/es/terms");
    await expect(page.getByRole("heading", { name: "Términos de Uso", level: 1 })).toBeVisible();

    await page.goto("/es/que-plantar/espana/noviembre");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qué plantar en noviembre en España");
    await expect(page.locator('link[rel="alternate"][hreflang="pt"]')).toHaveAttribute("href", /\/pt\/o-que-plantar\/espanha\/novembro$/);
    // Árvores frutíferas ficam de fora; o semiárido de novembro tem tomate.
    await expect(page.getByTestId("guide-zone-semiarid")).toContainText("Tomate");
    await expect(page.getByTestId("guide-zone-subtropical")).not.toContainText("Naranja");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("top-controls").getByRole("button", { name: "PT", exact: true }).click();
    await expect(page).toHaveURL(/\/pt\/o-que-plantar\/espanha\/novembro$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("O que plantar em novembro na Espanha");
    expect((await page.request.get("/pt/o-que-plantar/espanha/november")).status()).toBe(404);
    expect((await page.request.get("/what-to-plant/narnia/march")).status()).toBe(404);
    expect((await page.request.get("/api/health")).status()).toBe(200);
  });
});

test("calendário mensal: pede na página 'o que plantar', só com a caixa marcada, e confirma pelo e-mail", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/pt/o-que-plantar/portugal/marco");
  const box = page.getByTestId("guide-signup");
  await box.getByLabel("Seu e-mail").fill(email);
  await box.getByRole("button", { name: "Quero receber" }).click();
  await expect(box.getByText("Marque a caixa para confirmar.")).toBeVisible();
  await box.getByRole("checkbox", { name: /Quero receber todo mês, por e-mail, o que plantar em Portugal/ }).check();
  await box.getByRole("button", { name: "Quero receber" }).click();
  await expect(box.getByRole("status")).toContainText("Quase lá!");

  await page.goto("/dev/inbox");
  await page.locator("article", { hasText: "Confirme para receber o que plantar todo mês" }).filter({ hasText: email }).getByRole("link", { name: "Confirmar e receber" }).click();
  await expect(page.getByText("Pronto, está confirmado!")).toBeVisible();
  await page.goto("/confirm-guide/inventado");
  await expect(page.getByText("Link inválido")).toBeVisible();
});

test("?aba=diario antigo ainda abre o diário", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Vacas").check();
  await page.locator("#count-cows").fill("3");
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);
  await page.goto("/animals/cows?aba=diario");
  await expect(page.getByText("Nenhuma anotação ainda.")).toBeVisible();
});

test("robots.txt e sitemap.xml", async ({ page }) => {
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  for (const path of ["/pt/privacy", "/es/privacy", "/what-to-plant/brazil/march", "/es/que-plantar/mexico/enero"]) expect(sitemap).toContain(path);
});

test("área logada é noindex e a landing não", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await signup(page, uniqueEmail());
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});
