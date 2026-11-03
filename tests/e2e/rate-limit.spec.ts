import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

test("11 logins errados do mesmo IP bloqueiam com aviso de muitas tentativas", async ({ page }) => {
  // IP falso único: sem cabeçalho o site trata como "local" e não limita em desenvolvimento.
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` });
  await page.goto("/login");
  for (let i = 0; i < 11; i++) {
    await page.getByLabel("E-mail").fill(uniqueEmail()); // e-mails diferentes: o bloqueio por conta não entra antes
    await page.getByLabel("Senha").fill(PASSWORD);
    // Espera a resposta da ação antes de preencher de novo (o formulário se limpa ao receber o resultado).
    const resposta = page.waitForResponse((r) => r.request().method() === "POST");
    await page.getByRole("button", { name: "Entrar" }).click();
    await resposta;
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  }
  await expect(page.getByText("Muitas tentativas. Tente de novo em alguns minutos.")).toBeVisible();
});
