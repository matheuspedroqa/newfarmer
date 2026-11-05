import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";

/** Pasta fora do git com as sessões e as contas criadas nesta rodada (para apagar no fim). */
export const AUTH_DIR = "tests/prod/.auth";
const RUN_FILE = `${AUTH_DIR}/run.json`;

export type Who = "admin" | "paidA" | "paidB" | "unpaid";
export type TestUser = { username: string; email: string; password: string; storage?: string };

export function adminCredentials() {
  const username = process.env.NF_ADMIN_USER;
  const password = process.env.NF_ADMIN_PASS;
  if (!username || !password) throw new Error("Defina NF_ADMIN_USER e NF_ADMIN_PASS (veja tests/prod/README.md).");
  return { username, password };
}

export const storageOf = (who: Who) => `${AUTH_DIR}/${who}.json`;

type Run = { users: Record<string, TestUser> };
export function readRun(): Run {
  return existsSync(RUN_FILE) ? (JSON.parse(readFileSync(RUN_FILE, "utf8")) as Run) : { users: {} };
}
/** Guarda a conta para a limpeza do fim apagar, mesmo se o teste quebrar no meio. */
export function remember(key: string, user: TestUser) {
  mkdirSync(AUTH_DIR, { recursive: true });
  const run = readRun();
  run.users[key] = user;
  writeFileSync(RUN_FILE, JSON.stringify(run, null, 2));
}
export const userOf = (key: string): TestUser => {
  const u = readRun().users[key];
  if (!u) throw new Error(`Conta de teste "${key}" não existe: rode o projeto setup primeiro.`);
  return u;
};

/** Contas de teste: e-mail na caixa de teste do Resend (aceita e descarta, sem prejudicar o domínio). */
export function newTestUser(tag: string): TestUser {
  const stamp = Date.now().toString(36) + randomBytes(2).toString("hex");
  return { username: `pw${tag}${stamp}`.toLowerCase().slice(0, 30), email: `delivered+nf-${tag}-${stamp}@resend.dev`, password: `Pw-${randomBytes(9).toString("base64url")}` };
}

/** Abre uma página já logada como uma das contas da rodada. */
export async function openAs(browser: Browser, who: Who): Promise<Page> {
  const ctx = await browser.newContext({ storageState: storageOf(who) });
  return ctx.newPage();
}

/** Cadastro até a etapa 2 (/welcome). Não usa login (o limite de logins por rede é pequeno). */
export async function register(page: Page, user: TestUser, name = "Teste Playwright") {
  await page.goto("/register");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByLabel("Confirmar senha").fill(user.password);
  await page.getByTestId("city-input").fill("Curitiba");
  await page.getByTestId("city-option").first().click();
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/welcome$/, { timeout: 30_000 });
}

/** Paga na Stripe com o cartão de teste. Se o checkout não for de teste (cs_test_), para sem pagar. */
export async function payWithTestCard(page: Page) {
  await expect(page).toHaveURL(/\/subscribe$/);
  await page.getByRole("button", { name: /^Assinar por/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });
  expect(page.url(), "A Stripe NÃO está em modo teste: parei sem pagar.").toContain("cs_test_");
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Teste Playwright");
  const zip = page.locator("#billingPostalCode");
  if (await zip.isVisible().catch(() => false)) await zip.fill("80000");
  await page.locator(".SubmitButton, button[type=submit]").first().click();
  await page.waitForURL(/\/dashboard$/, { timeout: 90_000 });
}

/** Apaga uma conta de teste pela tela do Perfil. Nunca a do admin. */
export async function deleteAccount(page: Page, user: TestUser) {
  if (user.username === process.env.NF_ADMIN_USER?.toLowerCase()) throw new Error("Recusado: nunca apagar a conta do admin.");
  await page.goto("/profile");
  if (await page.getByText(/Security Checkpoint|verificar seu navegador|verificando seu navegador/i).count()) throw new Error("o firewall da Vercel bloqueou o robô");
  if (!page.url().endsWith("/profile")) return false; // sessão já não vale
  await page.getByLabel("Entendo que a conta e os dados serão apagados para sempre").check();
  await page.getByLabel("Sua senha").fill(user.password);
  await page.getByRole("button", { name: "Apagar minha conta" }).click();
  await page.waitForURL(/account=deleted/, { timeout: 30_000 });
  return true;
}

export type CapturedAction = { url: string; headers: Record<string, string>; body: Buffer };

/** Clica e segura o pedido da server action antes de chegar ao site (nada muda lá); devolve o pedido para reenviar como outra pessoa. */
export async function captureAction(page: Page, trigger: () => Promise<void>): Promise<CapturedAction> {
  let captured: CapturedAction | undefined;
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"] && !captured) {
      captured = { url: req.url(), headers: req.headers(), body: req.postDataBuffer() ?? Buffer.alloc(0) };
      return route.abort();
    }
    return route.continue();
  });
  await trigger();
  await expect.poll(() => captured !== undefined, { message: "o clique não mandou server action" }).toBe(true);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  return captured!;
}

/** Reenvia uma server action capturada com o cookie de outra conta e a origem escolhida. */
export function replayAction(request: APIRequestContext, cap: CapturedAction, who: Who, origin = new URL(cap.url).origin) {
  const keep = ["next-action", "content-type", "accept", "next-router-state-tree"];
  const headers = Object.fromEntries(Object.entries(cap.headers).filter(([k]) => keep.includes(k)));
  return request.post(cap.url, { headers: { ...headers, cookie: cookieHeader(who), origin }, data: cap.body, maxRedirects: 0 });
}

/** Cookies de uma sessão salva, prontos para um cabeçalho Cookie. */
export function cookieHeader(who: Who): string {
  const state = JSON.parse(readFileSync(storageOf(who), "utf8")) as { cookies: { name: string; value: string }[] };
  return state.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** Salva a sessão de uma conta criada dentro de um teste e marca para a limpeza apagar. */
export async function keepSession(page: Page, key: string, user: TestUser) {
  const storage = `${AUTH_DIR}/${key}.json`;
  await page.context().storageState({ path: storage });
  remember(key, { ...user, storage });
}
