import { expect, test } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

test("diário do animal: anotar, ver no painel e apagar", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.goto("/animais/cows");
  await page.getByRole("link", { name: "Diário" }).click();
  await expect(page).toHaveURL(/\/animais\/cows\?aba=diario$/);
  await expect(page.getByText("Nenhuma anotação ainda.")).toBeVisible();

  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(page.getByText("Preencha este campo")).toBeVisible();

  await page.getByLabel("Tipo").selectOption({ label: "Vacina" });
  await page.getByLabel("Qual animal (opcional)").fill("Mimosa");
  await page.getByLabel("Anotação", { exact: true }).fill("Vacina contra aftosa");
  await page.getByRole("button", { name: "Salvar anotação" }).click();

  const entry = page.getByTestId("diary-entry");
  await expect(entry).toHaveCount(1);
  await expect(entry).toContainText("Vacina");
  await expect(entry).toContainText("Mimosa");
  await expect(entry).toContainText("Vacina contra aftosa");
  await expect(page.getByLabel("Anotação", { exact: true })).toHaveValue("");

  await page.goto("/painel");
  await expect(page.getByTestId("diary-recent")).toContainText("Vacina contra aftosa");

  await page.goto("/animais/cows?aba=diario");
  await page.getByRole("button", { name: "Apagar anotação" }).click();
  await expect(page.getByTestId("diary-entry")).toHaveCount(0);
  await expect(page.getByText("Nenhuma anotação ainda.")).toBeVisible();
});

test("a ficha continua sendo a aba padrão do animal", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.goto("/animais/cows");
  await expect(page.getByRole("heading", { name: "Raças" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ficha" })).toHaveAttribute("aria-current", "page");
});
