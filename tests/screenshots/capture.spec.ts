import { expect, test, type Browser, type Page } from "@playwright/test";
import { createAccount, subscribeFake } from "../e2e/helpers";

const cookie = (name: string, value: string) => ({ name, value, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const });

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// Fora dos prints: aviso de conexão, pedido de confirmar e-mail (o selo do modo de desenvolvimento some com devIndicators: false).
const HIDE = "[data-testid=offline-status],[data-testid=verify-banner]{display:none !important}";

/** Qualquer erro de página ou do console derruba a execução: nada de erro escondido atrás dos prints. */
function failOnErrors(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  // "Failed to load resource" não diz qual; a resposta com status de erro diz (e o 404 do compilador do dev é refeito em gotoOk).
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(`console: ${m.text()}`));
  page.on("response", (r) => r.status() >= 400 && !r.request().isNavigationRequest() && errors.push(`${r.status()} ${r.url()}`));
}

/** O servidor de desenvolvimento às vezes responde 404 enquanto compila a rota; recarrega até a página de verdade aparecer. */
async function gotoOk(page: Page, path: string) {
  for (let i = 0; i < 4; i++) {
    const res = await page.goto(path);
    if (res?.status() === 200) return;
    await page.waitForTimeout(3000);
  }
  throw new Error(`${path} não abriu`);
}

// A moldura do celular desenha a barra de status por cima; sem esse respiro o conteúdo ficaria sob a ilha.
// A faixa fixa imita o fundo da barra de status (o conteúdo rolado some sob ela); os cartões do fim do Painel saem, para o print terminar inteiro acima da barra de baixo.
const MOBILE_TOP = "body{padding-top:38px !important}body::before{content:'';position:fixed;top:0;left:0;right:0;height:38px;background:var(--bg);z-index:60}body::after{content:'';display:block;height:700px}[data-testid=season-tip],[data-testid=diary-recent]{display:none !important}";

// Os 5 cartões do Clima não cabem inteiros acima da barra de baixo; um pouco menor, cabem.
const WEATHER_FIT = "main{zoom:.82}";
// O Painel começa no topo (saudação e clima); um pouco menor e sem o cartão das plantações, o fim cabe inteiro acima da barra de baixo.
const DASH_FIT = "main{zoom:.8}[data-testid=crop-chips]{display:none !important}";

async function shoot(browser: Browser, errors: string[], state: Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>, lang: "pt" | "en" | "es", device: keyof typeof DEVICES) {
  const cookies = [...state.cookies.filter((c) => c.name !== "nf_locale"), cookie("nf_locale", lang), cookie("nf_consent", "essential")];
  const ctx = await browser.newContext({ ...DEVICES[device], storageState: { cookies, origins: [] } });
  const page = await ctx.newPage();
  failOnErrors(page, errors);
  const pages: [string, string][] = [["dashboard", "/dashboard"], ["animal", "/animals/chickens?tab=diary"], ["weather", "/weather"]];
  for (const [name, path] of pages) {
    await gotoOk(page, path);
    await page.addStyleTag({ content: HIDE + (device === "mobile" ? MOBILE_TOP : "") + (device === "mobile" && name === "weather" ? WEATHER_FIT : "") + (device === "mobile" && name === "dashboard" ? DASH_FIT : "") });
    await page.waitForLoadState("networkidle");
    // Rola até o que importa, para nenhum cartão sair cortado pela barra de baixo.
    const focus = name === "animal" ? page.getByTestId("diary-entry").first() : device !== "mobile" ? null : name === "weather" ? page.locator("h2").first() : null;
    await focus?.evaluate((el, dy) => { el.scrollIntoView({ block: "start" }); window.scrollBy(0, dy); }, device === "mobile" ? -46 : -20);
    await page.screenshot({ caret: "initial", path: `public/screenshots/${lang}-${name}-${device}.png` });
  }
  if (lang === "en" && device === "desktop") {
    await page.setViewportSize({ width: 1200, height: 630 });
    await gotoOk(page, "/dashboard");
    // Só o clima e os animais, inteiros: o resto do Painel sairia cortado nos 630 px.
    await page.addStyleTag({ content: HIDE + "[data-testid=crop-chips],[data-testid=season-tip],[data-testid=diary-recent]{display:none !important}" });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ caret: "initial", path: "src/app/opengraph-image.png" });
  }
  await ctx.close();
}

type Notes = [string, string][];
const NOTES: Record<"pt" | "en" | "es", Notes> = {
  pt: [["Vacina", "Vacinação contra Newcastle de todo o galinheiro"], ["Alimentação", "Ração nova no comedouro e água trocada"], ["Outro", "Recolhi 18 ovos hoje, postura boa"]],
  en: [["Vacina", "Newcastle vaccine for the whole coop"], ["Alimentação", "New feed in the trough and fresh water"], ["Outro", "Collected 18 eggs today, good laying"]],
  es: [["Vacina", "Vacuna contra Newcastle para todo el gallinero"], ["Alimentação", "Pienso nuevo en el comedero y agua cambiada"], ["Outro", "Recogí 18 huevos hoy, buena puesta"]],
};

/** Cria a conta de demonstração pela tela (em português, como os helpers) com as anotações no idioma pedido. */
async function demoAccount(page: Page, email: string, notes: Notes) {
  await createAccount(page, email, "Fundão", undefined, "Maria");
  for (const [label, id, n] of [["Galinhas", "chickens", "24"], ["Cabras", "goats", "6"], ["Vacas", "cows", "3"]]) {
    await page.getByLabel(label).check();
    await page.locator(`#count-${id}`).fill(n);
  }
  for (const crop of ["Tomate", "Alface", "Batata", "Milho"]) await page.getByRole("checkbox", { name: crop, exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);

  await page.goto("/animals/chickens?tab=diary");
  for (const [i, [type, text]] of notes.entries()) {
    await page.getByLabel("Tipo").selectOption({ label: type });
    await page.getByLabel("Anotação", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Salvar anotação" }).click();
    await page.getByTestId("diary-entry").nth(i).waitFor();
  }
  return page.context().storageState();
}

test("prints do sistema com a conta de demonstração", async ({ page, browser }) => {
  const errors: string[] = [];
  failOnErrors(page, errors);
  // Uma conta por idioma, para as anotações do diário aparecerem no idioma do print.
  const ptState = await demoAccount(page, "maria@exemplo.com", NOTES.pt);
  await page.context().clearCookies();
  await page.context().addCookies([cookie("nf_locale", "pt"), cookie("nf_consent", "essential")]);
  const enState = await demoAccount(page, "maria.en@exemplo.com", NOTES.en);
  await page.context().clearCookies();
  await page.context().addCookies([cookie("nf_locale", "pt"), cookie("nf_consent", "essential")]);
  const esState = await demoAccount(page, "maria.es@exemplo.com", NOTES.es);

  for (const [lang, state] of [["pt", ptState], ["en", enState], ["es", esState]] as const) {
    for (const device of ["desktop", "mobile"] as const) await shoot(browser, errors, state, lang, device);
  }
  expect(errors, "erros no navegador durante os prints").toEqual([]);
});
