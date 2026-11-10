import { expect, test } from "@playwright/test";
import { createAccount, openUserMenu, signup, uniqueEmail, subscribeFake } from "./helpers";

test("etapa 2 do cadastro salva animais e plantações e mostra no painel", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await expect(page.getByRole("heading", { name: "Minha fazenda" })).toBeVisible();

  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("12");
  await page.getByLabel("Cabras").check();
  await page.locator("#count-goats").fill("3");
  await page.getByRole("checkbox", { name: "Tomate", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await subscribeFake(page);
  await expect(page.getByTestId("animal-tile-chickens")).toContainText("12");
  await expect(page.getByTestId("animal-tile-goats")).toContainText("3");
  await expect(page.getByTestId("crop-chips")).toContainText("Tomate");
  await expect(page.getByTestId("weather-hero")).toContainText("18°");
});

test("quantidade inválida mostra erro e não sai da etapa 2", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Porcos").check();
  await page.locator("#count-pigs").fill("0");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Informe pelo menos 1")).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.locator("#count-pigs")).toHaveValue("0");
});

test("pular a etapa 2 leva ao painel vazio", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page.getByText("Você ainda não marcou animais.")).toBeVisible();
  await expect(page.getByText("Você ainda não marcou plantações.")).toBeVisible();
});

test("MyFarm edita animais e plantações", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("12");
  await page.getByRole("checkbox", { name: "Tomate", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);

  await openUserMenu(page, "MyFarm");
  await expect(page.locator("#count-chickens")).toHaveValue("12");
  await page.locator("#count-chickens").fill("15");
  await page.getByLabel("Patos").check();
  await page.locator("#count-ducks").fill("5");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo!")).toBeVisible();

  // Cada aba salva só a sua parte; a outra continua como estava.
  await page.getByRole("navigation", { name: "Seções do MyFarm" }).getByRole("link", { name: "Plantações" }).click();
  await expect(page).toHaveURL(/\/myfarm\/crops$/);
  await expect(page.locator("#count-chickens")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Tomate", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Milho", exact: true }).check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo!")).toBeVisible();

  await page.getByRole("link", { name: "Painel", exact: true }).click();
  await expect(page.getByTestId("animal-tile-chickens")).toContainText("15");
  await expect(page.getByTestId("animal-tile-ducks")).toContainText("5");
  await expect(page.getByTestId("crop-chips")).toContainText("Milho");
  await expect(page.getByTestId("crop-chips")).not.toContainText("Tomate");
});

test("Perfil troca a cidade e o clima acompanha", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.goto("/profile");
  await expect(page.getByTestId("current-city")).toContainText("Curitiba");
  await page.getByTestId("city-input").fill("Lisboa");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Trocar cidade" }).click();
  await expect(page.getByText("Cidade atualizada.", { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("current-city")).toContainText("Lisboa");
  await expect(page.getByTestId("user-climate")).toContainText("Hemisfério norte");
});

test("aba Clima mostra a previsão de 5 dias", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Clima", exact: true }).click();
  await expect(page).toHaveURL(/\/weather$/);
  await expect(page.getByTestId("day-card")).toHaveCount(5);
  await expect(page.getByText("Próximos 5 dias")).toBeVisible();
  // provedor falso: o segundo dia tem chuva (3,2 mm), o quarto é seco
  await expect(page.getByTestId("day-card").nth(1)).toContainText("3,2 mm");
  await expect(page.getByTestId("day-card").nth(3)).not.toContainText("mm");
});

test("MyFarm e Clima exigem login", async ({ page }) => {
  for (const path of ["/myfarm", "/weather", "/welcome"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
