import { expect, test, type Page } from "@playwright/test";
import { createAccount, uniqueEmail, subscribeFake } from "./helpers";

async function signupWithCows(page: Page) {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Vacas").check();
  await page.locator("#count-cows").fill("3");
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);
}

/** Espera o modo offline assumir a página e guardar as páginas principais no aparelho. */
async function waitSaved(page: Page, paths: string[]) {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
  await page.waitForFunction(
    async (list) => {
      const cache = await caches.open("nf-pages-v1");
      for (const p of list) if (!(await cache.match(location.origin + p, { ignoreVary: true }))) return false;
      return true;
    },
    paths,
    { timeout: 30_000 },
  );
}

test("anotação feita sem internet fica no aparelho e é enviada quando a internet volta", async ({ page, context }) => {
  await signupWithCows(page);
  await waitSaved(page, ["/animals/cows?tab=diary"]);
  await page.goto("/animals/cows?tab=diary");

  await context.setOffline(true);
  await page.getByLabel("Anotação", { exact: true }).fill("Feito sem internet");
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(page.getByText("Sem internet: anotação guardada no aparelho.", { exact: false })).toBeVisible();
  await expect(page.getByTestId("diary-waiting")).toContainText("Feito sem internet");

  // Recarregar sem internet: a página vem do aparelho e a anotação continua na fila.
  await page.reload();
  await expect(page.getByTestId("offline-status")).toContainText("sem internet");
  await expect(page.getByTestId("diary-waiting")).toContainText("Feito sem internet");
  await expect(page.getByTestId("diary-entry")).toHaveCount(0);

  await context.setOffline(false);
  await expect(page.getByTestId("diary-entry")).toHaveCount(1, { timeout: 20_000 });
  await expect(page.getByTestId("diary-entry")).toContainText("Feito sem internet");
  await expect(page.getByTestId("diary-waiting")).toHaveCount(0);

  // Recarregar online não reenvia: continua uma só.
  await page.reload();
  await expect(page.getByTestId("diary-entry")).toHaveCount(1);
});

test("sem internet dá para trocar de página entre as que ficaram guardadas", async ({ page, context }) => {
  await signupWithCows(page);
  await waitSaved(page, ["/weather", "/animals/cows"]);

  await context.setOffline(true);
  await page.getByRole("link", { name: "Clima" }).first().click();
  await expect(page).toHaveURL(/\/weather$/);
  await expect(page.getByTestId("offline-status")).toBeVisible();
  await page.goto("/animals/cows");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test("MyFarm salvo sem internet é enviado quando a internet volta", async ({ page, context }) => {
  await signupWithCows(page);
  await waitSaved(page, ["/myfarm"]);
  await page.goto("/myfarm");
  await page.waitForLoadState("networkidle"); // hidratar antes de ficar offline

  await context.setOffline(true);
  await page.getByLabel("Ovelhas").check();
  await page.locator("#count-sheep").fill("4");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Sem internet: alterações guardadas no aparelho.", { exact: false })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByTestId("offline-status")).toHaveCount(0, { timeout: 20_000 });
  await page.reload();
  await expect(page.getByLabel("Ovelhas")).toBeChecked();
  await expect(page.locator("#count-sheep")).toHaveValue("4");
});
