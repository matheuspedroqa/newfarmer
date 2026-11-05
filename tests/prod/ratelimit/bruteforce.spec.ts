import { expect, test } from "@playwright/test";
import { keepSession, newTestUser, register } from "../helpers";

// Roda por último e só com PENTEST_RATELIMIT=1: depois dele, logins desta rede ficam bloqueados por 15 minutos.
test("força bruta: 5 senhas erradas travam a conta e o excesso de tentativas bloqueia a rede", async ({ page, context }) => {
  const user = newTestUser("brute");
  await register(page, user);
  await keepSession(page, "brute", user);
  await context.clearCookies({ name: "nf_session" });

  let accountLocked = false;
  let ipBlocked = false;
  for (let i = 1; i <= 15 && !ipBlocked; i++) {
    await page.goto("/login");
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Senha").fill(`chute-${i}`);
    await page.getByRole("button", { name: "Entrar" }).click();
    const msg = page.getByText(/Username ou senha incorretos|Muitas tentativas/).first();
    await expect(msg).toBeVisible();
    const text = await msg.innerText();
    if (text.includes("15 minutos")) accountLocked = true;
    if (text.includes("alguns minutos")) ipBlocked = true;
  }
  expect(accountLocked, "a conta não travou depois de 5 senhas erradas").toBe(true);
  expect(ipBlocked, "a rede não foi bloqueada depois de muitas tentativas").toBe(true);

  // Travada, nem a senha certa entra.
  await page.goto("/login");
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Muitas tentativas").first()).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
