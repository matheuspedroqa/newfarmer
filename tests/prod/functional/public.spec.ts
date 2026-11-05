import { expect, test } from "@playwright/test";

test.describe("páginas públicas", () => {
  test("landing em português: título, preço, botões e sem perguntas frequentes", async ({ page }) => {
    await page.goto("/pt");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByTestId("price")).toContainText(/\/mês/);
    await expect(page.getByRole("main").getByRole("link", { name: /^Assinar por/ }).first()).toHaveAttribute("href", "/register");
    await expect(page.getByText("Perguntas frequentes")).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("link", { name: "Experimente já" })).toBeVisible();
  });

  test("landing em inglês na raiz e o seletor de idioma troca a URL", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("banner").getByRole("link", { name: "Try it now" })).toBeVisible();
    await page.getByRole("button", { name: "PT", exact: true }).click();
    await expect(page).toHaveURL(/\/pt$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });

  test("Experimente já: Computador/Celular, como funciona em 4 passos e assinatura no fim", async ({ page }) => {
    await page.goto("/pt");
    await page.getByRole("banner").getByRole("link", { name: "Experimente já" }).click();
    await expect(page).toHaveURL(/\/pt\/try$/);
    const items = page.getByTestId("showcase-item");
    await expect(items).toHaveCount(3);
    await page.getByRole("button", { name: "Computador" }).click();
    await expect(items.first().locator("img")).toHaveAttribute("src", /desktop/);
    await expect(page.getByText(/newfarmer\.(vercel\.)?app\//)).toHaveCount(0);
    await page.getByRole("button", { name: "Celular" }).click();
    await expect(items.first().locator("img")).toHaveAttribute("src", /mobile/);
    await expect(page.getByRole("heading", { name: "Como funciona" })).toBeVisible();
    await expect(page.locator("ol > li")).toHaveCount(4);
    await expect(page.getByTestId("price")).toBeVisible();
  });

  test("rodapé: links alinhados e Preferências de cookies reabre o aviso", async ({ page }) => {
    await page.goto("/pt");
    const footer = page.getByRole("contentinfo");
    const tops = await Promise.all(["Privacidade", "Termos", "Contato"].map(async (n) => (await footer.getByRole("link", { name: n }).boundingBox())!.y));
    tops.push((await footer.getByRole("button", { name: "Preferências de cookies" }).boundingBox())!.y);
    expect(Math.max(...tops) - Math.min(...tops), "itens do rodapé desalinhados").toBeLessThanOrEqual(2);
    await footer.getByRole("button", { name: "Preferências de cookies" }).click();
    await expect(page.getByRole("button", { name: "Aceitar todos" })).toBeVisible();
  });

  test("Privacidade e Termos abrem e mostram o contato novo", async ({ page }) => {
    for (const path of ["/pt/privacy", "/pt/terms", "/privacy", "/terms"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByRole("link", { name: "contact@newfarmer.app" }).first()).toHaveAttribute("href", "mailto:contact@newfarmer.app");
      await expect(page.locator("body")).not.toContainText("hotmail");
    }
  });

  test("Contato: valida os campos e envia (manda 1 e-mail para contact@newfarmer.app)", async ({ page }) => {
    await page.goto("/pt/contact");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Preencha este campo").first()).toBeVisible();
    await page.getByLabel("Nome").fill("Robô Playwright");
    await page.getByLabel("Seu e-mail").fill("nao-e-email");
    await page.getByLabel("Mensagem").fill("Teste automático");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Digite um e-mail válido")).toBeVisible();
    await page.getByLabel("Seu e-mail").fill("delivered@resend.dev");
    await page.getByLabel("Mensagem").fill(`Teste automático do Playwright (${new Date().toISOString()}). Pode apagar.`);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByTestId("contact-sent")).toBeVisible();
  });

  test("rotas antigas em português redirecionam (308) e página inexistente dá 404", async ({ request }) => {
    for (const [from, to] of [["/cadastro", "/register"], ["/painel", "/dashboard"], ["/privacidade", "/privacy"], ["/termos", "/terms"]]) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(res.headers().location, from).toBe(to);
    }
    expect((await request.get("/pagina-que-nao-existe")).status()).toBe(404);
  });

  test("SEO: robots, sitemap com as páginas novas, manifest e imagem de compartilhamento", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: https://newfarmer.app/sitemap.xml");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const p of ["/pt/try", "/pt/contact", "/pt/privacy", "/try", "/contact"]) expect(sitemap, p).toContain(`https://newfarmer.app${p}`);
    expect((await request.get("/manifest.webmanifest")).status()).toBe(200);
    expect((await request.get("/opengraph-image.png")).headers()["content-type"]).toContain("image/png");
  });

  test("endereço antigo da Vercel redireciona para o domínio novo", async ({ request }) => {
    const res = await request.get("https://newfarmer.vercel.app/", { maxRedirects: 0 });
    expect([301, 307, 308]).toContain(res.status());
    expect(res.headers().location).toMatch(/^https:\/\/newfarmer\.app\/?/);
  });
});
