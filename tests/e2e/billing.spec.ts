import { expect, test } from "@playwright/test";
import { createAccount, openUserMenu, signup, subscribeFake, uniqueEmail } from "./helpers";

test("passo 2 de 3, preço por país e assinatura leva ao painel", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await expect(page.getByText("Passo 2 de 3")).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Sua criação");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await expect(page.getByTestId("subscribe-price")).toContainText("R$ 6,99");
  await subscribeFake(page);
});

test("preço em euro para Lisboa", async ({ page }) => {
  await createAccount(page, uniqueEmail(), "Lisboa");
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  await expect(page.getByTestId("subscribe-price")).toContainText(/€\s?1[.,]99/);
});

test("sem assinar, o app fica bloqueado mas o perfil abre", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  for (const path of ["/dashboard", "/animals", "/weather"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/subscribe$/);
  }
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText("Sem assinatura")).toBeVisible();
});

test("sessão de outra conta não libera o acesso (com cliente já criado)", async ({ page }) => {
  const { username } = await createAccount(page, uniqueEmail());
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  // Cliente existe e sem acesso: só assim a página de retorno chega à comparação do cliente.
  expect((await page.request.post("/api/dev/ensure-customer", { data: { username } })).status()).toBe(204);
  await page.goto("/subscribe/success?session_id=fake_999999");
  await expect(page).toHaveURL(/\/subscribe$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/subscribe$/);
});

test("sem assinar, a navegação interna também é bloqueada", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await openUserMenu(page, "Perfil");
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole("link", { name: "Painel", exact: true }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await openUserMenu(page, "Perfil");
  await page.getByRole("link", { name: "Plantações", exact: true }).click();
  await expect(page).toHaveURL(/\/subscribe$/);
  await expect(page.getByRole("navigation", { name: "NewFarmer" })).toBeVisible(); // o menu aparece também sem assinatura, mas leva para cá
  await openUserMenu(page, "MyFarm");
  await expect(page).toHaveURL(/\/subscribe$/);
});

test("perfil mostra Ativa e Gerenciar ou cancelar", async ({ page }) => {
  await signup(page, uniqueEmail());
  await openUserMenu(page, "Perfil");
  const card = page.getByTestId("billing-card");
  await expect(card).toContainText("Ativa");
  await expect(card.getByRole("button", { name: "Gerenciar ou cancelar" })).toBeVisible();
});
