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

for (const [path, title] of [["/login", "Entrar"], ["/recuperar", "Recuperar"], ["/privacidade", "Privacidade"], ["/termos", "Termos"]]) {
  test(`${path} tem título próprio`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · NewFarmer`);
  });
}

for (const [path, title, heading] of [
  ["/privacidade", "Privacy", "Privacy Policy"],
  ["/termos", "Terms", "Terms of Use"],
]) {
  test(`${path} em inglês tem título e texto em inglês`, async ({ page, context }) => {
    await context.addCookies([{ name: "nf_locale", value: "en", domain: "localhost", path: "/" }]);
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · NewFarmer`);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}

test("as páginas legais em português mostram o texto e o contato", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeVisible();
  await expect(page.getByRole("link", { name: "matheusps70@hotmail.com" }).first()).toHaveAttribute("href", "mailto:matheusps70@hotmail.com");
  await page.goto("/termos");
  await expect(page.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeVisible();
});

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

test("ícone do site: todas as páginas apontam para um SVG que existe", async ({ page, request }) => {
  const conferir = async (path: string) => {
    await page.goto(path);
    const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(href, path).toBeTruthy();
    const res = await request.get(new URL(href!, page.url()).toString());
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain("svg");
  };
  await conferir("/");
  await conferir("/login");
  await conferir("/nao-existe");
  await signup(page, uniqueEmail());
  await conferir("/painel");
});

test("botões do topo mudam de cor ao passar o mouse", async ({ page }) => {
  await signup(page, uniqueEmail());
  const alvos = [
    page.getByRole("button", { name: "Sair" }),
    page.getByTestId("user-menu-button"),
    page.getByTestId("top-controls").getByRole("button", { name: "EN", exact: true }),
    page.getByTestId("theme-toggle"),
  ];
  for (const alvo of alvos) {
    await page.mouse.move(0, 0);
    await expect.poll(() => alvo.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    await alvo.hover();
    await expect.poll(() => alvo.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  }
});
