import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { openAs, remember, userOf } from "../helpers";

test.describe("app do assinante (conta A)", () => {
  let page: Page;
  test.beforeEach(async ({ browser }) => {
    page = await openAs(browser, "paidA");
  });

  test("Painel: clima, animais, plantações, tarefas do mês e o que plantar (sem árvores frutíferas)", async () => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Olá, Ana Teste!" })).toBeVisible();
    await expect(page.getByTestId("user-climate")).toContainText("Curitiba");
    await expect(page.getByTestId("weather-hero")).toBeVisible();
    await expect(page.getByTestId("animal-tile-cows")).toContainText("3");
    await expect(page.getByTestId("crop-chips")).toContainText("Tomate");
    const plant = page.getByTestId("plant-this-month");
    await expect(plant).toContainText("Este mês você pode plantar");
    expect(await plant.getByRole("link").count()).toBeGreaterThan(0);
    for (const tree of ["Laranja", "Manga", "Abacate", "Café"]) await expect(plant.getByRole("link", { name: new RegExp(tree) })).toHaveCount(0);
    await plant.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/crops\/[a-zA-Z]+$/);
  });

  test("Animais: lista, ficha, diário grava, aparece no Painel e apaga", async () => {
    await page.goto("/animals");
    await page.getByRole("main").getByRole("link", { name: /Vacas/ }).first().click();
    await expect(page).toHaveURL(/\/animals\/cows/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vacas");
    await page.goto("/animals/cows?tab=diary");
    const note = `Anotação Playwright ${Date.now()}`;
    await page.getByLabel("Anotação", { exact: true }).fill(note);
    await page.getByRole("button", { name: "Salvar anotação" }).click();
    const entry = page.getByTestId("diary-entry").filter({ hasText: note });
    await expect(entry).toHaveCount(1);
    await page.goto("/dashboard");
    await expect(page.getByTestId("diary-recent")).toContainText(note);
    await page.goto("/animals/cows?tab=diary");
    await entry.getByRole("button", { name: "Apagar anotação" }).click();
    await expect(entry).toHaveCount(0);
  });

  test("Plantações e Clima abrem com conteúdo", async () => {
    await page.goto("/crops");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/crops/tomato");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tomate");
    await page.goto("/crops/lettuce");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Alface");
    await page.goto("/weather");
    await expect(page.getByTestId("day-card")).toHaveCount(5);
  });

  test("MyFarm muda animais e plantações e o Painel acompanha (depois desfaz)", async () => {
    await page.goto("/myfarm");
    await page.getByLabel("Galinhas").check();
    await page.locator("#count-chickens").fill("7");
    await page.getByLabel("Buscar plantação").fill("milh");
    await page.getByRole("checkbox", { name: "Milho", exact: true }).check();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Salvo!")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByTestId("animal-tile-chickens")).toContainText("7");
    await expect(page.getByTestId("crop-chips")).toContainText("Milho");
    await page.goto("/myfarm");
    await page.getByLabel("Galinhas").uncheck();
    await page.getByRole("button", { name: "Desmarcar Milho" }).click();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Salvo!")).toBeVisible();
  });

  test("Perfil: idioma, modo noturno e e-mails de novidades ficam salvos", async () => {
    await page.goto("/profile");
    await page.getByLabel("English").check();
    await page.getByRole("button", { name: "Salvar idioma" }).click();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Português").check();
    await page.getByRole("button", { name: /Save language|Salvar idioma/ }).click();
    await expect(page.getByRole("button", { name: "PT", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.reload();
    const box = page.getByLabel("Receber novidades por e-mail");
    const before = await box.isChecked();
    await box.setChecked(!before);
    await page.getByTestId("marketing-card").getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Preferência salva.")).toBeVisible();
    await page.reload();
    await expect(box).toBeChecked({ checked: !before });
    await box.setChecked(before);
    await page.getByTestId("marketing-card").getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Preferência salva.")).toBeVisible();
  });

  test("Perfil: baixar meus dados traz a própria conta e nenhum segredo", async () => {
    const a = userOf("paidA");
    await page.goto("/profile");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Baixar meus dados" }).click()]);
    expect(download.suggestedFilename()).toBe(`newfarmer-${a.username}.json`);
    const text = await readFile((await download.path())!, "utf8");
    expect(JSON.parse(text).account).toMatchObject({ username: a.username, email: a.email });
    expect(text).not.toMatch(/password|token|hash|"cus_/i);
  });

  test("Perfil: trocar a senha exige a atual correta; a sessão atual continua", async () => {
    const a = userOf("paidA");
    const next = `${a.password}x`;
    await page.goto("/profile");
    await page.getByLabel("Senha atual").fill("senha-errada-123");
    await page.getByLabel("Nova senha", { exact: true }).fill(next);
    await page.getByLabel("Confirmar nova senha").fill(next);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText("Senha atual incorreta")).toBeVisible();
    await page.getByLabel("Senha atual").fill(a.password);
    await page.getByLabel("Nova senha", { exact: true }).fill(next);
    await page.getByLabel("Confirmar nova senha").fill(next);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText("Senha alterada.")).toBeVisible();
    remember("paidA", { ...a, password: next }); // a limpeza do fim apaga com a senha nova
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
