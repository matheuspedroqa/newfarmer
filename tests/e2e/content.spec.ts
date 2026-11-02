import { expect, test } from "@playwright/test";
import { createAccount, signup, uniqueEmail } from "./helpers";

test("aba Animais mostra as 6 abas, a ficha completa, o bloco do país e o aviso de veterinário", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByRole("link", { name: "Animais", exact: true }).click();
  await expect(page).toHaveURL(/\/animais\/chickens$/);
  for (const id of ["chickens", "pigs", "cows", "sheep", "goats", "ducks"]) {
    await expect(page.getByTestId(`animal-tab-${id}`)).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Raças" })).toBeVisible();
  await expect(page.getByTestId("current-season")).toHaveCount(1);
  await expect(page.getByTestId("disease").first()).toBeVisible();
  await expect(page.getByTestId("vet-warning")).toContainText("Consulte um veterinário");
  await expect(page.getByTestId("country-notes")).toContainText("No seu país: Brasil");
  await expect(page.getByTestId("sources").getByRole("link").first()).toBeVisible();

  await page.getByTestId("animal-tab-goats").click();
  await expect(page.getByRole("heading", { name: "Cabras", level: 1 })).toBeVisible();
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
  await page.goto("/plantacoes/tomato");
  const cells = () =>
    page.locator('[data-testid^="month-cell-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!));
  const south = await cells();

  await page.goto("/myfarm");
  await page.getByTestId("city-input").fill("Lisboa");
  await page.getByTestId("city-option").first().click();
  await page.getByRole("button", { name: "Trocar cidade" }).click();
  await expect(page.getByText("Cidade atualizada.", { exact: false }).first()).toBeVisible();

  await page.goto("/plantacoes/tomato");
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
  await expect(page.getByTestId("monthly-tasks")).toBeVisible();
  await expect(page.getByTestId("season-tip")).toContainText("Galinhas");
});

test("animal ou plantação inexistente mostra página não encontrada", async ({ page }) => {
  await signup(page, uniqueEmail());
  expect((await page.goto("/animais/dragons"))?.status()).toBe(404);
  expect((await page.goto("/plantacoes/pizza"))?.status()).toBe(404);
});
