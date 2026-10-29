import { expect, test } from "@playwright/test";
import { PASSWORD, signup, uniqueEmail } from "./helpers";

test("cadastro passa pela etapa 2 e chega ao painel com o tipo de clima da cidade", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page.getByRole("heading", { name: "Olá, Ana!" })).toBeVisible();
  await expect(page.getByTestId("user-climate")).toContainText("Curitiba");
  await expect(page.getByTestId("user-climate")).toContainText("Subtropical");
  await expect(page.getByTestId("user-climate")).toContainText("Hemisfério sul");
});

test("cadastro mostra os erros dos campos", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").fill("ana@");
  await page.getByLabel("Senha", { exact: true }).fill("123");
  await page.getByLabel("Confirmar senha").fill("456");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Preencha este campo")).toBeVisible();
  await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres")).toBeVisible();
  await expect(page.getByText("Escolha uma cidade da lista")).toBeVisible();
});

test("cidade inexistente mostra aviso", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByTestId("city-input").fill("Xyzlândia");
  await expect(page.getByText("Não encontramos essa cidade")).toBeVisible();
});

test("e-mail repetido avisa que já existe conta", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await context.clearCookies();
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill("Curitiba");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Este e-mail já tem uma conta. Quer entrar?")).toBeVisible();
});

test("sair, errar a senha e entrar de novo", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("painel sem login volta para a entrada", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login$/);
});

test("idioma e modo noturno mudam e continuam depois de recarregar", async ({ page }) => {
  await signup(page, uniqueEmail());

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();

  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("preferências voltam ao entrar de novo", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("recuperar a senha pela caixa de e-mail de teste", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await context.clearCookies();

  await page.goto("/recuperar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se houver uma conta com esse e-mail")).toBeVisible();

  await page.goto("/dev/inbox");
  await page.locator("article", { hasText: email }).first().getByRole("link").click();
  await page.getByLabel("Senha", { exact: true }).fill("nova-senha-1");
  await page.getByLabel("Confirmar senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha alterada")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});
