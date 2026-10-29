import { expect, type Page } from "@playwright/test";

export const PASSWORD = "segredo123";

export function uniqueEmail() {
  return `ana+${Date.now()}${Math.floor(Math.random() * 1000)}@exemplo.com`;
}

/** Faz a etapa 1 do cadastro e para na etapa 2 (/boas-vindas). */
export async function createAccount(page: Page, email: string, city = "Curitiba") {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill(city);
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/boas-vindas$/);
}

/** Cadastro completo pulando a etapa 2: termina no Painel. */
export async function signup(page: Page, email: string, city = "Curitiba") {
  await createAccount(page, email, city);
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}
