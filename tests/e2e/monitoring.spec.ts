import { expect, test } from "@playwright/test";
import { PASSWORD, clearSession, signup, uniqueEmail } from "./helpers";

test("usuário comum não vê Settings e recebe 404 nas telas do dono do site", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByRole("menuitem", { name: "Perfil" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toHaveCount(0);
  expect((await page.goto("/admin/activity"))?.status()).toBe(404);
  expect((await page.goto("/admin/monitoring"))?.status()).toBe(404);
});

test("dono do site vê Settings, o próprio login no Activity logs e os números do Monitoramento", async ({ page, context }) => {
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
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/admin\/activity$/);
  await expect(page).toHaveTitle("Activity logs · NewFarmer");
  const row = page.getByTestId("activity-row").filter({ hasText: "Entrou" }).filter({ hasText: username });
  await expect(row.first()).toBeVisible();

  await page.getByRole("link", { name: "Monitoramento" }).click();
  await expect(page).toHaveURL(/\/admin\/monitoring$/);
  await expect(page).toHaveTitle("Monitoramento · NewFarmer");
  await expect(page.getByTestId("stat-users")).toHaveText(/^\D*\d+/);
  await expect(page.getByTestId("stat-logins")).toContainText(/\d+/);
  await expect(page.getByTestId("stat-db")).toContainText(/\d+\s*ms/);
});
