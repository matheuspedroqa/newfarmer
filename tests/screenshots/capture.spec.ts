import { test, type Browser } from "@playwright/test";
import { createAccount, subscribeFake } from "../e2e/helpers";

const cookie = (name: string, value: string) => ({ name, value, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const });

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// Fora dos prints: aviso de conexão, pedido de confirmar e-mail e o selo de erros do modo de desenvolvimento.
const HIDE = "[data-testid=offline-status],[data-testid=verify-banner],nextjs-portal{display:none !important}";

async function shoot(browser: Browser, state: Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>, lang: "pt" | "en", device: keyof typeof DEVICES) {
  const cookies = [...state.cookies.filter((c) => c.name !== "nf_locale"), cookie("nf_locale", lang), cookie("nf_consent", "essential")];
  const ctx = await browser.newContext({ ...DEVICES[device], storageState: { cookies, origins: [] } });
  const page = await ctx.newPage();
  const pages: [string, string][] = [["dashboard", "/dashboard"], ["animal", "/animals/chickens?tab=diary"], ["weather", "/weather"]];
  for (const [name, path] of pages) {
    await page.goto(path);
    await page.addStyleTag({ content: HIDE });
    await page.waitForLoadState("networkidle");
    // No diário as anotações ficam abaixo do formulário: rola até elas, para o print mostrar o que foi escrito.
    if (name === "animal") await page.getByTestId("diary-entry").first().evaluate((el) => { el.scrollIntoView({ block: "start" }); window.scrollBy(0, -90); });
    await page.screenshot({ path: `public/screenshots/${lang}-${name}-${device}.png` });
  }
  if (lang === "en" && device === "desktop") {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto("/dashboard");
    await page.addStyleTag({ content: HIDE });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "src/app/opengraph-image.png" });
  }
  await ctx.close();
}

test("prints do sistema com a conta de demonstração", async ({ page, browser }) => {
  await createAccount(page, "maria@exemplo.com", "Fundão", undefined, "Maria");
  for (const [label, id, n] of [["Galinhas", "chickens", "24"], ["Cabras", "goats", "6"], ["Vacas", "cows", "3"]]) {
    await page.getByLabel(label).check();
    await page.locator(`#count-${id}`).fill(n);
  }
  for (const crop of ["Tomate", "Alface", "Batata", "Milho"]) await page.getByRole("checkbox", { name: crop, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);

  await page.goto("/animals/chickens?tab=diary");
  const notes: [string, string][] = [
    ["Vacina", "Vacinação contra Newcastle de todo o galinheiro"],
    ["Alimentação", "Ração nova no comedouro e água trocada"],
    ["Outro", "Recolhi 18 ovos hoje, postura boa"],
  ];
  for (const [i, [type, text]] of notes.entries()) {
    await page.getByLabel("Tipo").selectOption({ label: type });
    await page.getByLabel("Anotação", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Salvar anotação" }).click();
    await page.getByTestId("diary-entry").nth(i).waitFor();
  }

  const state = await page.context().storageState();
  for (const lang of ["pt", "en"] as const) for (const device of ["desktop", "mobile"] as const) await shoot(browser, state, lang, device);
});
