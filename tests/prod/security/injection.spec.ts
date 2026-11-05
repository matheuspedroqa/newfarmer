import { expect, test, type Page } from "@playwright/test";
import { cookieHeader, keepSession, newTestUser, openAs, userOf } from "../helpers";

const XSS = `<img src=x onerror="window.__xss=1">`;

/** Falha se algum script injetado rodou ou abriu janela. */
async function noXss(page: Page, where: string) {
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss), `XSS executou em ${where}`).toBeUndefined();
}

test.describe("injeção e exposição", () => {
  test("XSS + mass assignment no cadastro: nome com HTML vira texto e campos extras não dão poder de admin", async ({ page, browser }) => {
    const user = newTestUser("xss");
    await page.goto("/register");
    await page.getByLabel("Nome").fill(XSS);
    await page.getByLabel("E-mail", { exact: true }).fill(user.email);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Senha", { exact: true }).fill(user.password);
    await page.getByLabel("Confirmar senha").fill(user.password);
    await page.getByTestId("city-input").fill("Curitiba");
    await page.getByTestId("city-option").first().click();
    await page.getByLabel(/Li e aceito/).check();
    await page.evaluate(() => {
      const form = document.querySelector("form")!;
      for (const [name, value] of [["isPlatformAdmin", "true"], ["is_platform_admin", "on"], ["role", "admin"], ["status", "active"]]) {
        const input = document.createElement("input");
        Object.assign(input, { type: "hidden", name, value });
        form.appendChild(input);
      }
    });
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/welcome$/);
    await keepSession(page, "xss", user);
    for (const path of ["/welcome", "/profile", "/subscribe"]) {
      await page.goto(path);
      await noXss(page, path);
    }
    await expect(page.getByTestId("subscribe-price")).toBeVisible(); // continua sem assinatura
    // Sem assinatura, /admin leva para a assinatura; com, daria 404. Nunca abre o Admin.
    const res = await page.goto("/admin");
    expect(page.url().endsWith("/admin") ? res?.status() : 404).toBe(404);
    await expect(page.getByRole("navigation", { name: "Seções do Admin" })).toHaveCount(0);

    const admin = await openAs(browser, "admin");
    await admin.goto(`/admin/subscribers?q=${user.username}`);
    await expect(admin.getByTestId("subscriber-row")).toContainText(XSS);
    await noXss(admin, "Admin > Assinantes");
    await admin.getByTestId("subscriber-row").getByRole("link").first().click();
    await noXss(admin, "Admin > ficha");
  });

  test("XSS no diário: anotação com script aparece como texto", async ({ browser }) => {
    const page = await openAs(browser, "paidA");
    await page.goto("/animals/cows?tab=diary");
    const note = `<script>window.__xss=1</script>${XSS} ${Date.now()}`;
    await page.getByLabel("Anotação", { exact: true }).fill(note);
    await page.getByRole("button", { name: "Salvar anotação" }).click();
    const entry = page.getByTestId("diary-entry").filter({ hasText: "<script>window.__xss=1</script>" });
    await expect(entry).toHaveCount(1);
    await page.reload();
    await noXss(page, "diário");
    await page.goto("/dashboard");
    await noXss(page, "Painel (diário recente)");
    await page.goto("/animals/cows?tab=diary");
    await entry.getByRole("button", { name: "Apagar anotação" }).click();
    await expect(entry).toHaveCount(0);
  });

  test("XSS refletido: texto na URL não vira código", async ({ browser }) => {
    const admin = await openAs(browser, "admin");
    const payload = encodeURIComponent(`"><script>window.__xss=1</script>${XSS}`);
    for (const path of [`/admin/subscribers?q=${payload}`, `/admin/leads?days=${payload}&before=${payload}`, `/pt/contact?name=${payload}`, `/crops/${payload}`, `/login?error=${payload}`]) {
      await admin.goto(path);
      await noXss(admin, path);
    }
  });

  test("SQL injection: login, busca do Admin, Leads e cidades não quebram nem vazam", async ({ page, request, browser }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin' OR '1'='1' --");
    await page.getByLabel("Senha").fill("' OR '1'='1");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText(/Username ou senha incorretos|Use 3 a 30 letras/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    const adminCookie = { cookie: cookieHeader("admin") };
    for (const q of ["' OR 1=1 --", "%' OR '%'='", "'; DROP TABLE users; --", "\\", "' UNION SELECT password_hash FROM users --"]) {
      const res = await request.get(`/admin/subscribers?q=${encodeURIComponent(q)}`, { headers: adminCookie });
      expect(res.status(), q).toBe(200);
      const html = await res.text();
      // A busca volta escrita no campo (normal); vazamento seria um hash bcrypt ou erro do banco.
      expect(html, q).not.toMatch(/\$2[aby]\$\d\d\$|syntax error|PostgresError|relation "users"/);
    }
    // Busca maliciosa não lista todo mundo.
    const admin = await openAs(browser, "admin");
    await admin.goto(`/admin/subscribers?q=${encodeURIComponent("' OR 1=1 --")}`);
    await expect(admin.getByTestId("subscriber-row")).toHaveCount(0);
    for (const path of ["/admin/leads?days=1;DROP%20TABLE%20users&before=1%20OR%201=1", "/admin/subscribers?status=active'%20OR%201=1--&before=abc"]) {
      expect((await request.get(path, { headers: adminCookie })).status(), path).toBe(200);
    }
    expect((await request.get(`/api/cities?q=${encodeURIComponent("Lis' OR 1=1 --")}`)).status()).toBeLessThan(500);
  });

  test("redirecionamento aberto: parâmetros com outro site não levam para fora", async ({ page }) => {
    for (const path of ["/login?next=https://site-malicioso.example", "/login?redirect=//site-malicioso.example", "/register?returnTo=https://site-malicioso.example", "/subscribe/success?session_id=https://site-malicioso.example", "//site-malicioso.example/"]) {
      await page.goto(path).catch(() => undefined);
      expect(new URL(page.url()).hostname, path).toBe("newfarmer.app");
    }
  });

  test("arquivos internos não ficam expostos", async ({ request }) => {
    for (const path of ["/.env", "/.env.local", "/.env.prodtest", "/.git/config", "/.git/HEAD", "/package.json", "/next.config.ts", "/data/", "/tests/prod/.auth/admin.json", "/vercel.json", "/content/legal/privacy.pt.md", "/src/server/db.ts", "/%2e%2e/%2e%2e/etc/passwd", "/api/..%2f..%2f.env"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBeGreaterThanOrEqual(400);
      const body = await res.text();
      expect(body, path).not.toMatch(/DATABASE_URL|STRIPE_SECRET|RESEND_API_KEY|\[core\]|"dependencies"|root:x:0/);
    }
  });

  test("sem mapas do código-fonte (.map) públicos", async ({ page, request }) => {
    await page.goto("/pt");
    const scripts = await page.locator("script[src*='/_next/static/']").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src).slice(0, 5));
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      const res = await request.get(`${src}.map`);
      expect(res.status(), src).toBeGreaterThanOrEqual(400);
      expect(await res.text(), src).not.toContain("sourcesContent");
    }
  });

  test("erros não mostram detalhes internos", async ({ request }) => {
    for (const path of ["/crops/%3Cscript%3E", "/animals/..%2f..%2fetc", "/admin/subscribers/999999999999", "/reset-password/%00", "/api/cities?q[]=x&q[]=y"]) {
      const res = await request.get(path, { headers: { cookie: cookieHeader("admin") } });
      expect(res.status(), path).toBeLessThan(500);
      expect(await res.text(), path).not.toMatch(/node_modules|at Object\.|ECONNREFUSED|PostgresError|stack/i);
    }
  });

  test("enumeração de contas: recuperar senha e username respondem igual com e sem conta", async ({ page }) => {
    const b = userOf("paidB");
    const messages: string[] = [];
    for (const id of [b.username, `ninguem${Date.now()}`]) {
      await page.goto("/forgot-password");
      await page.getByLabel("Username ou e-mail").fill(id);
      await page.getByRole("button", { name: "Enviar link" }).click();
      await expect(page.getByRole("status")).toBeVisible();
      messages.push(await page.getByRole("status").innerText());
    }
    for (const email of [b.email, `delivered+ninguem${Date.now()}@resend.dev`]) {
      await page.goto("/forgot-username");
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Enviar username" }).click();
      await expect(page.getByRole("status")).toBeVisible();
      messages.push(await page.getByRole("status").innerText());
    }
    expect(messages[0]).toBe(messages[1]);
    expect(messages[2]).toBe(messages[3]);
  });

  test("clickjacking: o site não abre dentro de iframe de outro site", async ({ page }) => {
    await page.setContent(`<iframe id="f" src="https://newfarmer.app/login" width="600" height="400"></iframe>`);
    await page.waitForTimeout(4000);
    const frame = page.frame({ url: /newfarmer\.app\/login/ });
    const hasForm = frame ? await frame.locator("input[name=password]").count().catch(() => 0) : 0;
    expect(hasForm, "a tela de login abriu dentro de um iframe").toBe(0);
  });
});
