import { expect, test } from "@playwright/test";
import { PASSWORD, acceptTerms, clearSession, signup, uniqueEmail, uniqueUsername } from "./helpers";

test("cadastro passa pela etapa 2 e chega ao painel com o tipo de clima da cidade", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page.getByRole("heading", { name: "Olá, Ana!" })).toBeVisible();
  await expect(page.getByTestId("user-climate")).toContainText("Curitiba");
  await expect(page.getByTestId("user-climate")).toContainText("Subtropical");
  await expect(page.getByTestId("user-climate")).toContainText("Hemisfério sul");
});

test("cadastro mostra os erros dos campos", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@");
  await page.getByLabel("Senha", { exact: true }).fill("123");
  await page.getByLabel("Confirmar senha").fill("456");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Preencha este campo")).toBeVisible();
  await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres")).toBeVisible();
  await expect(page.getByText("Escolha uma cidade da lista")).toBeVisible();
});

test("cadastro sem aceitar os Termos ou sem ter 13 anos mostra o erro e mantém o que foi digitado", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("Tenho 13 anos ou mais").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Para criar a conta, aceite os Termos e a Política de Privacidade")).toBeVisible();
  await expect(page.getByText("O NewFarmer é para maiores de 13 anos")).toHaveCount(0);
  await expect(page.getByLabel("Nome")).toHaveValue("Ana");
  await expect(page.getByLabel("Tenho 13 anos ou mais")).toBeChecked();

  await page.getByLabel("Tenho 13 anos ou mais").uncheck();
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("O NewFarmer é para maiores de 13 anos")).toBeVisible();
  await expect(page.getByText("Para criar a conta, aceite os Termos e a Política de Privacidade")).toHaveCount(0);
  await expect(page.getByLabel(/Li e aceito/)).toBeChecked();
});

test("os links do aceite abrem os Termos e a Política em outra aba", async ({ page }) => {
  await page.goto("/register");
  const form = page.locator("form");
  await expect(form.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/terms");
  await expect(form.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("target", "_blank");
  await expect(form.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacy");
  await expect(form.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("target", "_blank");
});

test("cidade inexistente mostra aviso", async ({ page }) => {
  await page.goto("/register");
  await page.getByTestId("city-input").fill("Xyzlândia");
  await expect(page.getByText("Não encontramos essa cidade")).toBeVisible();
});

test("e-mail repetido avisa que já existe conta", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await clearSession(context);
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Username").fill(uniqueUsername());
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill("Curitiba");
  await page.getByTestId("city-option").first().click();
  await acceptTerms(page);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Este e-mail já tem uma conta. Quer entrar?")).toBeVisible();
});

test("username repetido avisa que já está em uso e mantém o que foi digitado", async ({ page, context }) => {
  const { username } = await signup(page, uniqueEmail());
  await clearSession(context);
  await page.goto("/register");
  const email = uniqueEmail();
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByTestId("city-input").fill("Curitiba");
  await page.getByTestId("city-option").first().click();
  await acceptTerms(page);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Este username já está em uso")).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(email);
  await expect(page.getByLabel("Username")).toHaveValue(username);
});

test("cadastro pede e-mail e username; login pede só username e senha", async ({ page, context }) => {
  const { username } = await signup(page, uniqueEmail());
  await clearSession(context);
  await page.goto("/login");
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveCount(0);
  await page.getByLabel("Username").fill(username.toUpperCase());
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("username inválido e reservado mostram o erro no campo", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Username").fill("ab");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Use 3 a 30 letras minúsculas")).toBeVisible();
  await page.getByLabel("Username").fill("Admin");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Este username é reservado. Escolha outro")).toBeVisible();
});

test("sair, errar a senha e entrar de novo", async ({ page }) => {
  const { username } = await signup(page, uniqueEmail());
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Username ou senha incorretos")).toBeVisible();

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("painel sem login volta para a entrada", async ({ page }) => {
  await page.goto("/dashboard");
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
  const { username } = await signup(page, uniqueEmail());
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await clearSession(context);
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ana!" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("recuperar a senha pela caixa de e-mail de teste", async ({ page, context }) => {
  const email = uniqueEmail();
  const { username } = await signup(page, email);
  await clearSession(context);

  await page.goto("/forgot-password");
  await page.getByLabel("Username ou e-mail").fill(username);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se houver uma conta, enviamos um link")).toBeVisible();

  await page.goto("/dev/inbox");
  await page.locator("article", { hasText: "Recupere sua senha" }).filter({ hasText: email }).getByRole("link", { name: "Criar nova senha" }).click();
  await page.getByLabel("Senha", { exact: true }).fill("nova-senha-1");
  await page.getByLabel("Confirmar senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Senha alterada")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill("nova-senha-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("recuperar a senha digitando o e-mail", async ({ page, context }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await clearSession(context);

  await page.goto("/forgot-password");
  await page.getByLabel("Username ou e-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se houver uma conta, enviamos um link")).toBeVisible();

  await page.goto("/dev/inbox");
  await expect(page.locator("article", { hasText: "Recupere sua senha" }).filter({ hasText: email })).toBeVisible();
});

test("esqueci o username: a mesma mensagem com e sem conta, e o e-mail chega só para quem tem conta", async ({ page, context }) => {
  const email = uniqueEmail();
  const { username } = await signup(page, email);
  await clearSession(context);

  const unknown = uniqueEmail();
  for (const typed of [email, unknown]) {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci o username" }).click();
    await page.getByLabel("E-mail", { exact: true }).fill(typed);
    await page.getByRole("button", { name: "Enviar username" }).click();
    await expect(page.getByText("Se houver uma conta com esse e-mail, enviamos o seu username.")).toBeVisible();
  }

  await page.goto("/dev/inbox");
  const article = page.locator("article", { hasText: "Seu username no NewFarmer" }).filter({ hasText: email });
  await expect(article).toContainText(username);
  await expect(page.locator("article", { hasText: unknown })).toHaveCount(0);
});
