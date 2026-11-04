import { expect, test } from "@playwright/test";
import { createAccount, uniqueEmail } from "./helpers";

test("respostas trazem cabeçalhos de segurança e não dizem a tecnologia", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("nada de dado interno do banco chega ao navegador", async ({ page }) => {
  await createAccount(page, uniqueEmail());
  await page.getByLabel("Vacas").check();
  await page.locator("#count-cows").fill("3");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/animals/cows?tab=diary");
  await page.getByLabel("Anotação", { exact: true }).fill("Vacina de teste");
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(page.getByTestId("diary-entry")).toHaveCount(1);
  for (const path of ["/dashboard", "/profile", "/myfarm", "/animals/cows?tab=diary"]) {
    await page.goto(path);
    expect(page.url().endsWith(path), `${path} redirecionou`).toBe(true);
    const html = await page.content(); // inclui o JSON que o Next manda para os componentes de cliente
    for (const leak of ["password_hash", "token_hash", "$2a$", "$2b$", "farm_id", "email_verified_at"]) {
      expect(html, `${path} vazou ${leak}`).not.toContain(leak);
    }
  }
});
