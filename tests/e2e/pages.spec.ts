import { expect, test } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

test("página inicial: CTA no topo leva ao cadastro; Entrar ao login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("NewFarmer");
  await page.getByRole("banner").getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Criar conta grátis" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page).toHaveTitle("Criar conta · NewFarmer");
});

test("endereço que não existe mostra a 404 da casa", async ({ page }) => {
  const res = await page.goto("/nao-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible();
  await expect(page).toHaveTitle("Página não encontrada · NewFarmer");
});

// A Tarefa 13 acrescenta /privacidade ("Privacidade") e /termos ("Termos") a esta lista.
for (const [path, title] of [["/login", "Entrar"], ["/recuperar", "Recuperar"]]) {
  test(`${path} tem título próprio`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · NewFarmer`);
  });
}

test("quem está logado vai da inicial ao painel, que tem título próprio", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page).toHaveTitle("Painel · NewFarmer");
  await page.goto("/");
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto("/plantacoes/tomato");
  await expect(page).toHaveTitle("Tomate · NewFarmer");
});

test.describe("aviso de cookies", () => {
  // Começa sem o cookie do aviso (mas em português).
  test.use({
    storageState: {
      cookies: [{ name: "nf_locale", value: "pt", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    },
  });

  test("aparece na primeira visita e some para sempre depois de Entendi", async ({ page }) => {
    await page.goto("/login");
    const aviso = page.getByRole("region", { name: "Aviso de cookies" });
    await expect(aviso).toContainText("Usamos apenas cookies essenciais para manter você conectado e lembrar idioma e tema.");
    await expect(aviso.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade");
    await aviso.getByRole("button", { name: "Entendi" }).click();
    await expect(aviso).toBeHidden();
    await page.reload();
    await expect(page.getByRole("button", { name: "Entrar" }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Aviso de cookies" })).toHaveCount(0);
  });
});
