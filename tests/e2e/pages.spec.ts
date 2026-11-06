import { expect, test, type Locator } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

test("página inicial: CTA no topo leva ao cadastro; Entrar ao login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("NewFarmer · Criação e horta organizadas pelo seu clima");
  await page.getByRole("banner").getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Assinar", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page).toHaveTitle("Criar conta · NewFarmer");
});

test("endereço que não existe mostra a 404 da casa", async ({ page }) => {
  const res = await page.goto("/nao-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible();
  await expect(page).toHaveTitle("Página não encontrada · NewFarmer");
});

for (const [path, title] of [["/login", "Entrar"], ["/forgot-password", "Recuperar"], ["/privacy", "Privacidade"], ["/terms", "Termos"]]) {
  test(`${path} tem título próprio`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · NewFarmer`);
  });
}

for (const [path, title, heading] of [
  ["/privacy", "Privacy", "Privacy Policy"],
  ["/terms", "Terms", "Terms of Use"],
]) {
  test(`${path} em inglês tem título e texto em inglês`, async ({ page, context }) => {
    await context.addCookies([{ name: "nf_locale", value: "en", domain: "localhost", path: "/" }]);
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · NewFarmer`);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}

test("as páginas legais em português mostram o texto e o contato", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeVisible();
  await expect(page.getByRole("link", { name: "contact@newfarmer.app" }).first()).toHaveAttribute("href", "mailto:contact@newfarmer.app");
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeVisible();
});

test("termos e privacidade falam de assinatura, preço, cookies e Stripe", async ({ page, context }) => {
  await page.goto("/terms");
  for (const t of ["R$ 7,99", "7 dias", "14 dias"]) await expect(page.getByRole("main")).toContainText(t);
  await page.goto("/privacy");
  for (const t of ["Stripe", "nf_vid", "Preferências de cookies", "Modo offline"]) await expect(page.getByRole("main")).toContainText(t);
  await context.addCookies([{ name: "nf_locale", value: "en", domain: "localhost", path: "/" }]);
  await page.goto("/terms");
  for (const t of ["€2.99", "$2.99"]) await expect(page.getByRole("main")).toContainText(t);
});

test("quem está logado vai da inicial ao painel, que tem título próprio", async ({ page }) => {
  await signup(page, uniqueEmail());
  await expect(page).toHaveTitle("Painel · NewFarmer");
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/crops/tomato");
  await expect(page).toHaveTitle("Tomate · NewFarmer");
});

test.describe("aviso de cookies", () => {
  // Começa sem o cookie do aviso (mas em português).
  test.use({
    storageState: {
      cookies: [{ name: "nf_locale", value: "pt", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    },
  });

  test("aparece na primeira visita e some para sempre depois de escolher", async ({ page }) => {
    await page.goto("/login");
    const aviso = page.getByRole("region", { name: "Aviso de cookies" });
    await expect(aviso).toContainText("Usamos cookies essenciais para manter você conectado e lembrar idioma e tema.");
    await expect(aviso.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacy");
    await aviso.getByRole("button", { name: "Só os essenciais" }).click();
    await expect(aviso).toBeHidden();
    await page.reload();
    await expect(page.getByRole("button", { name: "Entrar" }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Aviso de cookies" })).toHaveCount(0);
  });
});

test("ícone do site: todas as páginas apontam para um SVG que existe", async ({ page, request }) => {
  const conferir = async (path: string) => {
    await page.goto(path);
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /.+/);
    const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(href, path).toBeTruthy();
    const res = await request.get(new URL(href!, page.url()).toString());
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain("svg");
  };
  await conferir("/");
  await conferir("/login");
  await conferir("/nao-existe");
  await signup(page, uniqueEmail());
  await conferir("/dashboard");
});

for (const tema of ["claro", "escuro"]) {
  test(`botões do topo: hover e foco do teclado são visíveis no tema ${tema}`, async ({ page }) => {
    await signup(page, uniqueEmail());
    if (tema === "escuro") {
      await page.getByTestId("theme-toggle").click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const topo = page.getByTestId("top-controls");
    const alvos = [
      page.getByRole("button", { name: "Sair" }),
      page.getByTestId("user-menu-button"),
      topo.getByRole("button", { name: "EN", exact: true }), // o idioma NÃO selecionado
      page.getByTestId("theme-toggle"),
    ];
    const bg = (el: Locator) => el.evaluate((e) => getComputedStyle(e).backgroundColor);
    const sombra = (el: Locator) => el.evaluate((e) => getComputedStyle(e).boxShadow);
    for (const alvo of alvos) {
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      const repouso = await bg(alvo);
      await alvo.hover();
      await expect.poll(() => bg(alvo)).not.toBe(repouso);
    }
    // Foco por teclado: o anel (box-shadow) aparece em cada controle, inclusive no idioma já selecionado.
    await page.mouse.move(0, 0);
    for (const alvo of [...alvos, topo.getByRole("button", { name: "PT", exact: true })]) {
      await page.waitForTimeout(300);
      const repouso = await sombra(alvo);
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      for (let i = 0; i < 40 && !(await alvo.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press("Tab");
      await expect.poll(() => sombra(alvo)).not.toBe(repouso);
      // O anel não pode ter a cor do próprio fundo (no idioma selecionado, fundo e anel eram ambos verdes).
      const fundo = await bg(alvo);
      if (fundo !== "rgba(0, 0, 0, 0)") expect(await sombra(alvo)).not.toContain(fundo);
    }
  });
}

test.describe("landing: preço, alternância e dados estruturados", () => {
  // BR em português; Portugal e sem país em inglês (o formato do preço acompanha o idioma).
  for (const [country, lang, price] of [["BR", "pt", "R$ 7,99"], ["PT", "en", "€2.99"], [undefined, "en", "$2.99"]] as const) {
    test(`o botão do topo mostra ${price} (${country ?? "sem cabeçalho"})`, async ({ page, context }) => {
      await context.addCookies([{ name: "nf_locale", value: lang, domain: "localhost", path: "/" }]);
      await page.setExtraHTTPHeaders(country ? { "x-vercel-ip-country": country } : {});
      await page.goto("/");
      await expect(page.getByRole("main").getByRole("link", { name: /^(Assinar por|Subscribe for)/ }).first()).toContainText(price.replace(/\u00a0/g, " "));
    });
  }

  test("Experimente já: no topo, alternar Computador/Celular troca as imagens, a legenda fica fora do print e termina na assinatura", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Perguntas frequentes")).toHaveCount(0);
    await expect(page.getByTestId("showcase-item")).toHaveCount(0);
    await page.getByRole("banner").getByRole("link", { name: "Experimente já" }).click();
    await expect(page).toHaveURL(/\/pt\/try$|\/try$/);
    await expect(page.getByRole("heading", { level: 1, name: "Experimente já" })).toBeVisible();
    await expect(page.getByText("newfarmer.vercel.app")).toHaveCount(0);
    const items = page.getByTestId("showcase-item");
    await expect(items.first().locator("img")).toHaveAttribute("src", /dashboard-desktop/);
    await page.getByRole("button", { name: "Celular" }).click();
    await expect(page.getByRole("button", { name: "Celular" })).toHaveAttribute("aria-pressed", "true");
    await expect(items.first().locator("img")).toHaveAttribute("src", /dashboard-mobile/);
    await expect(items).toHaveCount(3);
    // O cartão flutuante não pode cobrir a legenda do print.
    await page.getByRole("button", { name: "Computador" }).click();
    const caption = await items.first().locator("p").last().boundingBox();
    const shot = await items.first().locator("img").boundingBox();
    expect(caption!.y).toBeGreaterThanOrEqual(shot!.y + shot!.height);
    await expect(page.getByRole("heading", { name: "Como funciona" })).toBeVisible();
    await expect(page.getByTestId("price")).toBeVisible();
  });

  test("JSON-LD é válido, com 3 ofertas e sem perguntas frequentes, e há um único h1", async ({ page }) => {
    await page.goto("/");
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((s) => [JSON.parse(s)].flat());
    const app = blocks.find((b) => b["@type"] === "SoftwareApplication");
    expect(blocks.find((b) => b["@type"] === "FAQPage")).toBeUndefined();
    expect(app.offers).toHaveLength(3);
    expect(app.offers.map((o: { priceCurrency: string }) => o.priceCurrency).sort()).toEqual(["BRL", "EUR", "USD"]);
    await expect(page.locator("h1")).toHaveCount(1);
  });
});

test("Contato: pelo rodapé, mostra os erros, envia e a mensagem chega na caixa de contato", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Contato" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fale conosco" })).toBeVisible();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Preencha este campo").first()).toBeVisible();

  const marca = `Teste ${Date.now()}`;
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("Seu e-mail").fill("ana@exemplo.com");
  await page.getByLabel("Mensagem").fill(marca);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByTestId("contact-sent")).toBeVisible();

  await page.goto("/dev/inbox");
  const mail = page.locator("article", { hasText: marca });
  await expect(mail).toContainText("contact@newfarmer.app");
  await expect(mail).toContainText("Contato pelo site: Ana");
});
