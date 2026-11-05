import { rmSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { adminCredentials, newTestUser, payWithTestCard, register, remember, storageOf } from "../helpers";

// Rodada nova: esquece as contas da anterior (a limpeza dela já apagou).
setup.beforeAll(() => rmSync("tests/prod/.auth/run.json", { force: true }));

setup("admin entra uma vez e a sessão é reaproveitada pelos outros testes", async ({ page }) => {
  const { username, password } = adminCredentials();
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "Seções do Admin" })).toBeVisible();
  await page.context().storageState({ path: storageOf("admin") });
});

setup("conta A: cadastro com vacas e tomate, paga com cartão de teste", async ({ page }) => {
  const user = newTestUser("a");
  remember("paidA", { ...user, storage: storageOf("paidA") });
  await register(page, user, "Ana Teste");
  await page.getByLabel("Vacas").check();
  await page.locator("#count-cows").fill("3");
  await page.getByRole("checkbox", { name: "Tomate", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await payWithTestCard(page);
  await page.context().storageState({ path: storageOf("paidA") });
});

setup("conta B: cadastro pulando a etapa 2, paga com cartão de teste", async ({ page }) => {
  const user = newTestUser("b");
  remember("paidB", { ...user, storage: storageOf("paidB") });
  await register(page, user, "Bia Teste");
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  await payWithTestCard(page);
  await page.context().storageState({ path: storageOf("paidB") });
});

setup("conta sem pagar: para no cadastro", async ({ page }) => {
  const user = newTestUser("u");
  remember("unpaid", { ...user, storage: storageOf("unpaid") });
  await register(page, user, "Caio Teste");
  await page.context().storageState({ path: storageOf("unpaid") });
});
