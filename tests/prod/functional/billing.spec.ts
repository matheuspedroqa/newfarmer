import { expect, test } from "@playwright/test";
import { openAs } from "../helpers";

test.describe("assinatura e trava", () => {
  test("sem pagar: toda tela do app e o menu levam para a assinatura", async ({ browser }) => {
    const page = await openAs(browser, "unpaid");
    for (const path of ["/dashboard", "/animals", "/animals/cows", "/animals/cows?tab=diary", "/crops", "/crops/tomato", "/weather", "/myfarm"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/subscribe$/);
    }
    await expect(page.getByTestId("subscribe-price")).toContainText(/R\$|€|US\$|\$/);
    for (const name of ["Painel", "Animais", "Plantações", "Clima"]) {
      await page.getByRole("navigation", { name: "NewFarmer" }).getByRole("link", { name, exact: true }).click();
      await expect(page, name).toHaveURL(/\/subscribe$/);
    }
    await page.goto("/profile/subscription");
    await expect(page).toHaveURL(/\/profile\/subscription$/);
    await expect(page.getByTestId("billing-card")).toContainText("Sem assinatura");
  });

  test("assinante: Perfil mostra Ativa, próxima cobrança e o portal da Stripe abre", async ({ browser }) => {
    const page = await openAs(browser, "paidA");
    await page.goto("/subscribe");
    await expect(page).toHaveURL(/\/dashboard$/); // quem já assina não vê a tela de pagamento
    await page.goto("/profile/subscription");
    const card = page.getByTestId("billing-card");
    await expect(card).toContainText("Ativa");
    await expect(card).toContainText("Próxima cobrança");
    await card.getByRole("button", { name: /Gerenciar/ }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 45_000 });
  });
});
