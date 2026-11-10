import { expect, test, type Locator, type Page } from "@playwright/test";
import { createAccount, PASSWORD, signup, uniqueEmail, subscribeFake } from "./helpers";

// Três celulares dos Global Constraints: o menor (320 px), o mais comum (375 px) e um grande (412 px).
const SIZES = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "Pixel 7", width: 412, height: 915 },
  { name: "Galaxy S9+", width: 320, height: 658 },
];

/** A página não rola para o lado. */
async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `rolagem horizontal em ${page.url()}`).toBeLessThanOrEqual(innerWidth);
  // No modo celular o navegador pode afastar o zoom e aumentar innerWidth; a tela de verdade é a do viewport.
  expect(innerWidth, `zoom afastado em ${page.url()}`).toBeLessThanOrEqual(page.viewportSize()!.width);
}

/** Visível e com pelo menos 44 px de altura e largura (área mínima de toque). */
async function expectTouchTarget(target: Locator) {
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box, "sem caixa").not.toBeNull();
  expect(box!.height, "altura do toque").toBeGreaterThanOrEqual(44);
  expect(box!.width, "largura do toque").toBeGreaterThanOrEqual(44);
}

async function checkPage(page: Page, path: string, nav: (p: Page) => Locator, main: (p: Page) => Locator, shot?: string) {
  await test.step(path, async () => {
    await page.goto(path);
    await expect(nav(page)).toBeVisible();
    await expectTouchTarget(main(page));
    await expectNoHorizontalScroll(page);
    // Só a tela visível: na foto de página inteira a barra fixa aparece no meio e confunde a revisão.
    if (shot) await page.screenshot({ path: `test-results/mobile/${shot}.png` });
  });
}

const appNav = (p: Page) => p.getByRole("navigation", { name: "NewFarmer" });
const header = (p: Page) => p.getByTestId("top-controls");

for (const size of SIZES) {
  test.describe(`celular ${size.name} (${size.width}×${size.height})`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, isMobile: true, hasTouch: true });
    const shot = (name: string) => (size.width === 375 ? name : undefined);

    test("páginas públicas cabem na tela", async ({ page }) => {
      await checkPage(page, "/", header, (p) => p.getByRole("main").getByRole("link", { name: /^Assinar por/ }).first());
      await checkPage(page, "/login", header, (p) => p.getByRole("button", { name: "Entrar" }));
      await checkPage(page, "/register", header, (p) => p.getByRole("button", { name: "Criar conta" }), shot("cadastro"));
      await checkPage(page, "/privacy", header, (p) => p.getByRole("banner").getByRole("link", { name: "Assinar", exact: true }));
      // Idioma e tema no topo das páginas públicas também têm área de toque.
      for (const path of ["/", "/login"]) {
        await page.goto(path);
        await expectTouchTarget(header(page).getByRole("button", { name: "PT", exact: true }));
        await expectTouchTarget(header(page).getByRole("button", { name: "EN", exact: true }));
        await expectTouchTarget(page.getByTestId("theme-toggle"));
      }
    });

    test("cadastro, páginas da conta e login de novo", async ({ page }) => {
      const { username } = await createAccount(page, uniqueEmail());
      await page.getByLabel("Galinhas").check();
      await page.locator("#count-chickens").fill("8");
      await page.getByRole("checkbox", { name: "Tomate", exact: true }).check();
      await expectNoHorizontalScroll(page);
      await expectTouchTarget(page.getByRole("button", { name: "Continuar" }));
      await page.getByRole("button", { name: "Continuar" }).click();
      await subscribeFake(page);

      await checkPage(page, "/dashboard", appNav, (p) => p.getByRole("link", { name: "Adicionar animal" }), shot("painel"));
      // A barra de baixo e os controles do topo também têm área de toque.
      for (const name of ["Painel", "Animais", "Plantações", "Clima"]) {
        await expectTouchTarget(appNav(page).getByRole("link", { name, exact: true }));
      }
      await expectTouchTarget(page.getByRole("button", { name: "Sair" }));
      await expectTouchTarget(page.getByTestId("user-menu-button"));
      await expectTouchTarget(page.getByTestId("theme-toggle"));
      await expectTouchTarget(page.getByRole("button", { name: "PT" }));

      await checkPage(page, "/animals/chickens", appNav, (p) => p.getByRole("link", { name: "Diário", exact: true }));
      await checkPage(page, "/animals/chickens?tab=diary", appNav, (p) => p.getByRole("button", { name: "Salvar anotação" }));
      await checkPage(page, "/crops", appNav, (p) => p.getByRole("link", { name: "Adicionar plantação" }));
      await checkPage(page, "/crops/tomato", appNav, (p) => p.getByRole("link", { name: "← Plantações por tipo" }));
      await checkPage(page, "/weather", appNav, (p) => appNav(p).getByRole("link", { name: "Clima", exact: true }), shot("clima"));
      await expect(page.getByRole("heading", { name: "Próximos 5 dias" })).toBeVisible();
      await expect(page.getByTestId("day-card")).toHaveCount(5);
      await checkPage(page, "/myfarm", appNav, (p) => p.getByRole("button", { name: "Salvar", exact: true }));
      await checkPage(page, "/profile/security", appNav, (p) => p.getByRole("button", { name: "Salvar nova senha" }));

      await page.getByRole("button", { name: "Sair" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await page.getByLabel("Username").fill(username);
      await page.getByLabel("Senha").fill(PASSWORD);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(appNav(page)).toBeVisible();
    });
  });
}

test.describe("celular: aviso de cookies na área logada (375 px)", () => {
  // Começa sem o cookie do aviso (os demais testes já o trazem aceito), mas mantém o site em português.
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    storageState: {
      cookies: [{ name: "nf_locale", value: "pt", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    },
  });

  test("o aviso fica acima da barra de baixo e os dois continuam clicáveis", async ({ page }) => {
    await signup(page, uniqueEmail());
    const notice = page.getByRole("region", { name: "Aviso de cookies" });
    const ok = notice.getByRole("button", { name: "Só os essenciais" });
    await expect(notice).toBeVisible();
    const noticeBox = (await notice.boundingBox())!;
    const navBox = (await appNav(page).boundingBox())!;
    expect(noticeBox.y + noticeBox.height, "o aviso cobre a barra").toBeLessThanOrEqual(navBox.y);
    await expectTouchTarget(ok);

    await appNav(page).getByRole("link", { name: "Clima", exact: true }).click();
    await expect(page).toHaveURL(/\/weather$/);
    await ok.click();
    await expect(notice).toBeHidden();
  });
});

test.describe("celular: tela sem animais (375 px)", () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

  test("o botão Adicionar animal tem área de toque", async ({ page }) => {
    await signup(page, uniqueEmail());
    await page.goto("/animals");
    await expectTouchTarget(page.getByRole("link", { name: "Adicionar animal" }));
  });
});

test.describe("celular: textos compridos e menu da conta (320 px)", () => {
  test.use({ viewport: { width: 320, height: 658 }, isMobile: true, hasTouch: true });

  test("nome e anotação sem espaços não alargam a página, e o menu cabe na tela", async ({ page }) => {
    await createAccount(page, uniqueEmail(), "Curitiba", undefined, "A".repeat(60));
    await page.getByLabel("Galinhas").check();
    await page.locator("#count-chickens").fill("3");
    await page.getByRole("button", { name: "Continuar" }).click();
    await subscribeFake(page);

    await page.goto("/animals/chickens?tab=diary");
    await page.getByLabel("Anotação").fill("x".repeat(200));
    await page.getByRole("button", { name: "Salvar anotação" }).click();
    await expect(page.getByTestId("diary-entry")).toHaveCount(1);
    await expectNoHorizontalScroll(page);

    await page.goto("/dashboard");
    await expect(page.getByTestId("diary-recent")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByTestId("user-menu-button").click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(box.x, "o menu sai pela esquerda").toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, "o menu sai pela direita").toBeLessThanOrEqual(innerWidth);
    for (const item of await menu.getByRole("menuitem").all()) {
      await expectTouchTarget(item);
    }
  });
});

test.describe("landing em larguras médias", () => {
  for (const width of [640, 700]) {
    test(`não rola na horizontal a ${width} px (nos dois formatos do Experimente já)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expectNoHorizontalScroll(page);
      await page.goto("/try");
      await expectNoHorizontalScroll(page);
      await page.getByRole("button", { name: "Celular" }).click();
      await expectNoHorizontalScroll(page);
      await page.getByRole("button", { name: "Computador" }).click();
      await expectNoHorizontalScroll(page);
    });
  }
});
