import { expect, test } from "@playwright/test";
import { keepSession, newTestUser, register, userOf } from "../helpers";

test.describe("cadastro e acesso", () => {
  test("cadastro mostra os erros de cada campo e não cria conta", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("E-mail", { exact: true }).fill("ana@");
    await page.getByLabel("Username").fill("ab");
    await page.getByLabel("Senha", { exact: true }).fill("123");
    await page.getByLabel("Confirmar senha").fill("456");
    await page.getByRole("button", { name: "Criar conta" }).click();
    for (const msg of ["Preencha este campo", "Digite um e-mail válido", "Use 3 a 30 letras minúsculas", "A senha precisa ter pelo menos 8 caracteres", "Escolha uma cidade da lista", "Para criar a conta, aceite os Termos"]) {
      await expect(page.getByText(msg).first(), msg).toBeVisible();
    }
    await expect(page).toHaveURL(/\/register$/);
  });

  test("username reservado e cidade inexistente avisam", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Username").fill("admin");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Este username é reservado")).toBeVisible();
    await page.getByTestId("city-input").fill("Xyzlândia Inexistente");
    await expect(page.getByText("Não encontramos essa cidade")).toBeVisible();
  });

  test("e-mail e username repetidos avisam que já existem", async ({ page }) => {
    const a = userOf("paidA");
    const fresh = newTestUser("dup");
    await page.goto("/register");
    await page.getByLabel("Nome").fill("Dup");
    await page.getByLabel("E-mail", { exact: true }).fill(a.email);
    await page.getByLabel("Username").fill(fresh.username);
    await page.getByLabel("Senha", { exact: true }).fill(fresh.password);
    await page.getByLabel("Confirmar senha").fill(fresh.password);
    await page.getByTestId("city-input").fill("Curitiba");
    await page.getByTestId("city-option").first().click();
    await page.getByLabel(/Li e aceito/).check();
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Este e-mail já tem uma conta")).toBeVisible();
    // Depois de um erro o site apaga as senhas e o aceite (de propósito): preenche de novo.
    await page.getByLabel("E-mail", { exact: true }).fill(fresh.email);
    await page.getByLabel("Username").fill(a.username);
    await page.getByLabel("Senha", { exact: true }).fill(fresh.password);
    await page.getByLabel("Confirmar senha").fill(fresh.password);
    await page.getByLabel(/Li e aceito/).check();
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Este username já está em uso")).toBeVisible();
  });

  test("cadastro novo cai na etapa 2 com o passo a passo e o menu; Sair volta para a entrada", async ({ page }) => {
    const user = newTestUser("out");
    await register(page, user);
    await keepSession(page, "logout", user);
    await expect(page.getByRole("navigation", { name: "NewFarmer" })).toBeVisible();
    await expect(page.getByTestId("verify-banner")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("páginas de recuperação abrem; link de senha inventado não troca a senha (o envio é testado em security)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page.getByLabel("Username ou e-mail")).toBeVisible();
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci o username" }).click();
    await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
    await page.goto("/reset-password/token-invalido-123");
    await page.getByLabel("Senha", { exact: true }).fill("Nova-senha-123");
    await page.getByLabel("Confirmar senha").fill("Nova-senha-123");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText("Este link expirou")).toBeVisible();
  });
});
