import { expect, test } from "@playwright/test";
import { createAccount, signup, uniqueEmail, subscribeFake } from "./helpers";

test("aba Animais mostra só os animais da fazenda, a ficha completa, o bloco do país e o aviso de veterinário", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("5");
  await page.getByLabel("Vacas").check();
  await page.locator("#count-cows").fill("2");
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);
  await page.getByRole("link", { name: "Animais", exact: true }).click();
  // A primeira visita compila /animals e a ficha no servidor de desenvolvimento: precisa de mais tempo.
  await expect(page).toHaveURL(/\/animals\/chickens$/, { timeout: 45_000 });
  await expect(page.locator('[data-testid^="animal-tab-"]')).toHaveCount(2);
  await expect(page.getByTestId("animal-tab-chickens")).toBeVisible();
  await expect(page.getByTestId("animal-tab-cows")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Raças" })).toBeVisible();
  await expect(page.getByTestId("current-season")).toHaveCount(1);
  await expect(page.getByTestId("country-notes")).toContainText("No seu país: Brasil");
  await expect(page.getByTestId("sources").getByRole("link").first()).toBeVisible();

  // Cada assunto em sua aba, pelo endereço (?tab=).
  const tab = (name: string) => page.getByRole("link", { name, exact: true }).click();
  await tab("Saúde");
  await expect(page).toHaveURL(/\/animals\/chickens\?tab=health$/);
  await expect(page.getByTestId("disease").first()).toBeVisible();
  await expect(page.getByTestId("vet-warning")).toContainText("Consulte um veterinário");
  await tab("Habitat e proteção");
  await expect(page.getByTestId("habitat-facts")).toContainText("Ninhos");
  await expect(page.getByTestId("predators")).toContainText("Como proteger");
  await tab("Alimentação");
  await expect(page.getByRole("heading", { name: "Alimentação", level: 2 })).toBeVisible();
  await tab("Reprodução");
  await expect(page.getByTestId("breeding-facts")).toContainText("21 dias");
  await tab("Bem-estar e manejo");
  await expect(page.getByTestId("routine")).toContainText("Todo dia");
  await expect(page.getByRole("heading", { name: "Como pegar e manusear" })).toBeVisible();
  await expect(page.getByTestId("sources").getByRole("link").first()).toBeVisible();
  await tab("Visão geral");
  await expect(page.getByRole("heading", { name: "Raças" })).toBeVisible();

  await page.getByTestId("animal-tab-cows").click();
  await expect(page.getByRole("heading", { name: "Vacas", level: 1 })).toBeVisible();

  // animal que a fazenda não tem volta para a primeira aba
  await page.goto("/animals/goats");
  await expect(page).toHaveURL(/\/animals\/chickens$/);
});

test("sem animais, Animais mostra o estado vazio e o botão leva ao MyFarm", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Animais", exact: true }).click();
  await expect(page).toHaveURL(/\/animals$/);
  await expect(page.getByRole("heading", { name: "Você ainda não tem animais" })).toBeVisible();
  await page.getByRole("link", { name: "＋ Adicionar animal" }).click();
  await expect(page).toHaveURL(/\/myfarm$/);
});

test("Plantações tem o botão Adicionar plantação que leva ao MyFarm", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Plantações", exact: true }).click();
  await page.getByRole("link", { name: "＋ Adicionar plantação" }).click();
  await expect(page).toHaveURL(/\/myfarm\/crops$/);
});

test("ficha de plantação mostra calendário no clima e hemisfério do usuário", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Plantações", exact: true }).click();
  await page.getByTestId("crop-link-tomato").click();
  await expect(page.getByText("Calendário no seu clima (Subtropical, Hemisfério sul)")).toBeVisible();
  await expect(page.getByTestId("current-month")).toHaveCount(1);
  await expect(page.locator('[data-testid^="month-cell-"]').first()).toBeVisible();
  await expect(page.getByTestId("sources")).toBeVisible();
});

test("hemisfério norte desloca o calendário em 6 meses", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.goto("/crops/tomato");
  const cells = () =>
    page.locator('[data-testid^="month-cell-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!));
  const south = await cells();

  await page.goto("/profile");
  await page.getByTestId("city-input").fill("Lisboa");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Trocar cidade" }).click();
  await expect(page.getByText("Cidade atualizada.", { exact: false }).first()).toBeVisible();

  await page.goto("/crops/tomato");
  await expect(page.getByText("Hemisfério norte").first()).toBeVisible();
  const shift = (id: string) => id.replace(/-(\d+)$/, (_, m) => `-${((Number(m) + 5) % 12) + 1}`);
  expect(new Set(await cells())).toEqual(new Set(south.map(shift)));
});

test("painel mostra o que fazer este mês e a dica da estação", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("10");
  for (const crop of ["Alface", "Tomate", "Milho", "Feijão", "Cebola", "Cenoura"]) await page.getByRole("checkbox", { name: crop, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);
  await expect(page.getByTestId("monthly-tasks")).toBeVisible();
  await expect(page.getByTestId("season-tip")).toContainText("Galinhas");
});

test("animal ou plantação inexistente mostra página não encontrada", async ({ page }) => {
  await signup(page, uniqueEmail());
  expect((await page.goto("/animals/dragons"))?.status()).toBe(404);
  expect((await page.goto("/crops/pizza"))?.status()).toBe(404);
});
