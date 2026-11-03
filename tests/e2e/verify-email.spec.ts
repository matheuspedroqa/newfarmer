import { expect, test } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

test("cadastro envia e-mail de confirmação; o link confirma e a faixa some", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  const banner = page.getByTestId("verify-banner");
  await expect(banner).toContainText(email);

  await banner.getByRole("button", { name: "Reenviar link" }).click();
  await expect(banner.getByRole("status")).toHaveText("Espere um minuto antes de pedir outro link.");

  await page.goto("/dev/inbox");
  const message = page.locator("article", { hasText: "Confirme seu e-mail no NewFarmer" }).filter({ hasText: email });
  await expect(message).toHaveCount(1);
  await message.getByRole("link", { name: "Confirmar meu e-mail" }).click();
  await expect(page.getByRole("heading", { name: "E-mail confirmado!" })).toBeVisible();

  await page.getByRole("link", { name: "Ir para o NewFarmer" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("verify-banner")).toHaveCount(0);
});

test("link de confirmação inventado avisa que venceu", async ({ page }) => {
  await page.goto("/confirmar/link-inventado");
  await expect(page.getByRole("heading", { name: "Link vencido ou inválido" })).toBeVisible();
});
