import { expect, test } from "@playwright/test";
import { cookieHeader, keepSession, newTestUser, register } from "../helpers";

test.describe("cabeçalhos, HTTPS, cookies e sessão", () => {
  test("toda página traz os cabeçalhos de segurança e não revela a tecnologia", async ({ request }) => {
    for (const path of ["/", "/pt", "/login", "/register", "/pt/contact", "/api/cities?q=Li"]) {
      const h = (await request.get(path)).headers();
      expect(h["x-powered-by"], path).toBeUndefined();
      expect(h["x-frame-options"], path).toBe("DENY");
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(h["strict-transport-security"], path).toMatch(/max-age=\d{7,}/);
      expect(h["permissions-policy"], path).toContain("camera=()");
      const csp = h["content-security-policy"] ?? "";
      for (const rule of ["default-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) expect(csp, `${path}: ${rule}`).toContain(rule);
      expect(csp, path).not.toContain("unsafe-eval");
    }
  });

  test("http:// vai para https://", async ({ request }) => {
    const res = await request.get("http://newfarmer.app/login", { maxRedirects: 0 });
    expect([301, 307, 308]).toContain(res.status());
    expect(res.headers().location).toMatch(/^https:\/\//);
  });

  test("páginas logadas não ficam em cache (nem no navegador nem na CDN)", async ({ request }) => {
    for (const path of ["/dashboard", "/profile", "/animals/cows?tab=diary"]) {
      const res = await request.get(path, { headers: { cookie: cookieHeader("paidA") }, maxRedirects: 0 });
      expect(res.status(), path).toBe(200);
      expect(res.headers()["cache-control"], path).toMatch(/private|no-store/);
      expect(res.headers()["cache-control"], path).not.toContain("public");
    }
  });

  test("cookie de sessão é HttpOnly, Secure e SameSite=Lax; o login cria um token novo e Sair invalida o antigo no servidor", async ({ page, context, browser }) => {
    const user = newTestUser("ses");
    await register(page, user);
    const first = (await context.cookies()).find((c) => c.name === "nf_session");
    expect(first, "cookie de sessão").toBeDefined();
    expect(first!.httpOnly).toBe(true);
    expect(first!.secure).toBe(true);
    expect(first!.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("nf_session");

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);
    // Cookie antigo reaproveitado (roubado) depois de Sair não entra.
    const thief = await browser.newContext();
    await thief.addCookies([{ ...first!, sameSite: "Lax" }]);
    const tp = await thief.newPage();
    await tp.goto("/welcome");
    await expect(tp).toHaveURL(/\/login$/);
    await thief.close();

    // Senha errada (1 tentativa) e certa (1): o token novo é diferente do antigo.
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Senha").fill("senha-errada-1");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Username ou senha incorretos")).toBeVisible();
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/subscribe$/);
    const second = (await context.cookies()).find((c) => c.name === "nf_session");
    expect(second!.value).not.toBe(first!.value);
    await keepSession(page, "session", user);
  });

  test("cookie de sessão inventado não entra", async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: "nf_session", value: "a".repeat(64), domain: "newfarmer.app", path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
    const p = await ctx.newPage();
    await p.goto("/dashboard");
    await expect(p).toHaveURL(/\/login$/);
    await ctx.close();
  });
});
