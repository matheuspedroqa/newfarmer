import { expect, test } from "@playwright/test";
import { PASSWORD, clearSession, openUserMenu, signup, uniqueEmail } from "./helpers";

test.describe("primeira visita, sem idioma escolhido", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("o site abre em inglês", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
});

test("menu da conta fica à esquerda do Sair e abre MyFarm e Perfil", async ({ page }) => {
  await signup(page, uniqueEmail());
  const menuBox = await page.getByTestId("user-menu-button").boundingBox();
  const logoutBox = await page.getByRole("button", { name: "Sair" }).boundingBox();
  expect(menuBox!.x).toBeLessThan(logoutBox!.x);

  await page.getByTestId("user-menu-button").click();
  await expect(page.getByRole("menuitem", { name: "MyFarm" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Perfil" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await openUserMenu(page, "MyFarm");
  await expect(page).toHaveURL(/\/myfarm$/);
  await openUserMenu(page, "Perfil");
  await expect(page).toHaveURL(/\/perfil$/);
});

test("Perfil mostra as informações da pessoa", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await openUserMenu(page, "Perfil");
  const info = page.getByTestId("profile-info");
  await expect(info).toContainText("Ana");
  await expect(info).toContainText(email);
  await expect(info).toContainText("Curitiba");
  await expect(info).toContainText("Subtropical");
});

test("Perfil troca a senha (e recusa senha atual errada)", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await page.goto("/perfil");

  await page.getByLabel("Senha atual").fill("errada123");
  await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-1");
  await page.getByLabel("Confirmar nova senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha atual incorreta")).toBeVisible();

  await page.getByLabel("Senha atual").fill(PASSWORD);
  await page.getByLabel("Nova senha", { exact: true }).fill("nova-senha-1");
  await page.getByLabel("Confirmar nova senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha alterada.", { exact: false })).toBeVisible();

  await clearSession(context);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("Perfil troca o idioma e a escolha fica salva na conta", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await page.goto("/perfil");
  await page.getByLabel("English").check();
  await page.getByRole("button", { name: "Salvar idioma" }).click();
  await expect(page.getByRole("heading", { name: "Profile", level: 1 })).toBeVisible();

  await clearSession(context); // cookie volta para português...
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  // ...mas ao entrar vale o idioma salvo na conta
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
});

test("Perfil exige login", async ({ page }) => {
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/login$/);
});

test("sessão vencida ou falsa volta para a entrada em vez de dar erro", async ({ page, context }) => {
  await context.addCookies([{ name: "nf_session", value: "sessao-que-nao-existe", domain: "localhost", path: "/" }]);
  for (const path of ["/painel", "/perfil", "/plantacoes/tomato", "/animais/chickens"]) {
    const response = await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    expect(response?.status()).toBeLessThan(500);
  }
});
