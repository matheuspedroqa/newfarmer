import { expect, test } from "@playwright/test";
import { PASSWORD, clearSession, createAccount, signup, subscribeFake, uniqueEmail } from "./helpers";

test("usuário comum não vê Admin e recebe 404 nas telas do dono do site", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByRole("menuitem", { name: "Perfil" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Admin" })).toHaveCount(0);
  for (const path of ["/admin", "/admin/subscribers", "/admin/subscribers/1", "/admin/activity", "/admin/monitoring"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("dono do site vê as abas, o próprio login, o Monitoramento e abre o detalhe de um assinante", async ({ page, context }) => {
  // Assinante com cidade e animais.
  const email = uniqueEmail();
  const { username: subUsername } = await createAccount(page, email, "Curitiba");
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("5");
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);
  await clearSession(context);

  const { username } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username } })).status()).toBe(204);

  // Sai e entra de novo para gerar um login no registro.
  await clearSession(context);
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByTestId("user-menu-button").click();
  await page.getByRole("menuitem", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page).toHaveTitle("Admin · NewFarmer");
  const nav = page.getByRole("navigation", { name: "Seções do Admin" });
  for (const name of ["Visão geral", "Assinantes", "Activity logs", "Monitoramento"]) await expect(nav.getByRole("link", { name })).toBeVisible();
  await expect(page.getByTestId("overview-active")).toBeVisible();
  await expect(page.getByTestId("views-chart").locator("li")).toHaveCount(14);

  await nav.getByRole("link", { name: "Assinantes" }).click();
  await expect(page).toHaveURL(/\/admin\/subscribers$/);
  await page.getByLabel("Buscar por nome, e-mail ou username").fill(email.slice(0, email.indexOf("@")).toUpperCase());
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByTestId("subscriber-row")).toHaveCount(1);
  await page.getByTestId("subscriber-row").getByRole("link").click();
  await expect(page).toHaveURL(/\/admin\/subscribers\/\d+$/);
  await expect(page.getByTestId("detail-account")).toContainText("Curitiba");
  await expect(page.getByTestId("detail-account")).toContainText(email);
  await expect(page.getByTestId("detail-farm")).toContainText("Galinhas");
  await expect(page.getByTestId("detail-farm")).toContainText("5");
  const html = await page.content();
  for (const proibido of ["password_hash", "token_hash", "unsubscribe_token", "stripe_events"]) expect(html).not.toContain(proibido);

  for (const path of ["/admin/subscribers/abc", "/admin/subscribers/99999999"]) expect((await page.goto(path))?.status(), path).toBe(404);

  await page.goto("/admin/activity");
  await expect(page).toHaveTitle("Activity logs · NewFarmer");
  await expect(page.getByTestId("activity-row").filter({ hasText: "Entrou" }).filter({ hasText: username }).first()).toBeVisible();
  await expect(page.getByTestId("activity-row").filter({ hasText: "Viu dados de uma conta" }).filter({ hasText: subUsername }).first()).toBeVisible();

  await nav.getByRole("link", { name: "Monitoramento" }).click();
  await expect(page).toHaveURL(/\/admin\/monitoring$/);
  await expect(page).toHaveTitle("Monitoramento · NewFarmer");
  await expect(page.getByTestId("stat-users")).toHaveText(/^\D*\d+/);
  await expect(page.getByTestId("stat-logins")).toContainText(/\d+/);
  await expect(page.getByTestId("stat-db")).toContainText(/\d+\s*ms/);
});

test("Admin no celular não rola a página na horizontal", async ({ page }) => {
  const { username } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username } })).status()).toBe(204);
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/admin", "/admin/subscribers"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
  }
  await page.goto("/admin/subscribers");
  await expect(page.getByTestId("subscriber-card").first()).toBeVisible();
});
