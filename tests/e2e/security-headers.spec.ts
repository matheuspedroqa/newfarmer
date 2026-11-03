import { expect, test } from "@playwright/test";
import { signup, uniqueEmail } from "./helpers";

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
  await signup(page, uniqueEmail());
  for (const path of ["/painel", "/perfil", "/myfarm", "/animais/cows?aba=diario"]) {
    await page.goto(path);
    const html = await page.content(); // inclui o JSON que o Next manda para os componentes de cliente
    for (const leak of ["password_hash", "token_hash", "$2a$", "$2b$", "farm_id", "email_verified_at"]) {
      expect(html, `${path} vazou ${leak}`).not.toContain(leak);
    }
  }
});
