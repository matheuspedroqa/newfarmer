import { expect, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "segredo123";

export function uniqueEmail() {
  return `ana+${Date.now()}${Math.floor(Math.random() * 1000)}@exemplo.com`;
}

/** Até 30 caracteres, só minúsculas e números: sempre um username válido. */
export function uniqueUsername() {
  return `ana${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Marca as duas caixas obrigatórias do cadastro. */
export async function acceptTerms(page: Page) {
  await page.getByLabel(/Li e aceito/).check();
  await page.getByLabel("Tenho 13 anos ou mais").check();
}

/** Faz a etapa 1 do cadastro e para na etapa 2 (/welcome). */
export async function createAccount(page: Page, email: string, city = "Curitiba", username = uniqueUsername(), name = "Ana", marketing = false) {
  await page.goto("/register");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill(city);
  await page.getByTestId("city-option").first().click();
  await acceptTerms(page);
  if (marketing) await page.getByLabel("Quero receber novidades e ofertas do NewFarmer por e-mail").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  return { username };
}

/** Na tela /subscribe: assina (pagamento falso) e termina no Painel. */
export async function subscribeFake(page: Page) {
  await expect(page).toHaveURL(/\/subscribe$/);
  await page.getByRole("button", { name: /^Assinar por/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Cadastro completo pulando a etapa 2 e assinando: termina no Painel. */
export async function signup(page: Page, email: string, city = "Curitiba", username = uniqueUsername()) {
  await createAccount(page, email, city, username);
  await page.getByRole("link", { name: "Pular por enquanto" }).click();
  await subscribeFake(page);
  return { username };
}

/** Sai da conta (apaga os cookies) mas mantém o site em português, como nos demais testes. */
export async function clearSession(context: BrowserContext) {
  await context.clearCookies();
  await context.addCookies([
    { name: "nf_locale", value: "pt", domain: "localhost", path: "/" },
    { name: "nf_consent", value: "essential", domain: "localhost", path: "/" },
  ]);
}

/** Abre o menu da conta (canto superior direito) e escolhe uma opção. */
export async function openUserMenu(page: Page, option: "MyFarm" | "Perfil") {
  await page.getByTestId("user-menu-button").click();
  await page.getByRole("menuitem", { name: option }).click();
}
