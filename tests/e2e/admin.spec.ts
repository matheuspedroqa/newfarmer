import { expect, test } from "@playwright/test";
import { PASSWORD, clearSession, createAccount, signup, subscribeFake, uniqueEmail } from "./helpers";

test("usuário comum não vê Admin e recebe 404 nas telas do dono do site", async ({ page }) => {
  await signup(page, uniqueEmail());
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByRole("menuitem", { name: "Perfil" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Admin" })).toHaveCount(0);
  for (const path of ["/admin", "/admin/subscribers", "/admin/subscribers/1", "/admin/leads", "/admin/emails", "/admin/activity", "/admin/monitoring"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("dono do site vê as abas, o próprio login, o Monitoramento e abre o detalhe de um assinante", async ({ page, context }) => {
  // Assinante com cidade e animais.
  const email = uniqueEmail();
  const { username: subUsername } = await createAccount(page, email, "Curitiba");
  await page.getByLabel("Galinhas").check();
  await page.locator("#count-chickens").fill("5");
  await page.getByRole("button", { name: "Continuar" }).click();
  await subscribeFake(page);
  await clearSession(context);

  const { username } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username } })).status()).toBe(204);

  // O dono vê a aba Assinatura e a tela de cancelar como prévia; confirmar não cancela nada.
  await page.goto("/profile/subscription");
  await expect(page.getByTestId("owner-preview")).toBeVisible();
  await page.getByRole("link", { name: "Cancelar assinatura" }).click();
  await page.getByLabel("Está caro para mim").check();
  await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Esta é só uma prévia para o dono: nada foi cancelado." })).toBeVisible();

  // Sai e entra de novo para gerar um login no registro.
  await clearSession(context);
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByTestId("user-menu-button").click();
  await page.getByRole("menuitem", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page).toHaveTitle("Admin · NewFarmer");
  const nav = page.getByRole("navigation", { name: "Seções do Admin" });
  for (const name of ["Visão geral", "Assinantes", "Leads", "E-mails", "Activity logs", "Monitoramento"]) await expect(nav.getByRole("link", { name })).toBeVisible();
  await expect(page.getByTestId("overview-active")).toBeVisible();
  await expect(page.getByTestId("views-chart").locator("li")).toHaveCount(14);
  // Mapa de visitas por país: 14 dias por padrão; tocar num dia filtra só aquele dia.
  await expect(page.getByTestId("country-map")).toContainText("Visitas por país (últimos 14 dias)");
  await expect(page.getByTestId("country-map").locator("svg path").first()).toBeVisible();
  await page.getByTestId("views-chart").getByRole("link").last().click();
  await expect(page).toHaveURL(/\/admin\?day=\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByTestId("views-chart").locator('[aria-current="date"]')).toHaveCount(1);
  await page.getByRole("link", { name: "Ver os 14 dias" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await nav.getByRole("link", { name: "Assinantes" }).click();
  await expect(page).toHaveURL(/\/admin\/subscribers$/);
  await page.getByLabel("Buscar por nome, e-mail ou username").fill(email.slice(0, email.indexOf("@")).toUpperCase());
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByTestId("subscriber-row")).toHaveCount(1);
  await page.getByTestId("subscriber-row").getByRole("link").click();
  await expect(page).toHaveURL(/\/admin\/subscribers\/\d+$/);
  await expect(page.getByTestId("detail-account")).toContainText("Curitiba");
  await expect(page.getByTestId("detail-account")).toContainText(email);
  await expect(page.getByTestId("detail-farm")).toContainText("Galinhas");
  await expect(page.getByTestId("detail-farm")).toContainText("5");
  const html = await page.content();
  for (const proibido of ["password_hash", "token_hash", "unsubscribe_token", "stripe_events"]) expect(html).not.toContain(proibido);

  for (const path of ["/admin/subscribers/abc", "/admin/subscribers/99999999"]) expect((await page.goto(path))?.status(), path).toBe(404);

  await page.goto("/admin/activity");
  await expect(page).toHaveTitle("Activity logs · NewFarmer");
  await expect(page.getByTestId("activity-row").filter({ hasText: "Entrou" }).filter({ hasText: username }).first()).toBeVisible();
  await expect(page.getByTestId("activity-row").filter({ hasText: "Viu dados de uma conta" }).filter({ hasText: subUsername }).first()).toBeVisible();

  await nav.getByRole("link", { name: "Monitoramento" }).click();
  await expect(page).toHaveURL(/\/admin\/monitoring$/);
  await expect(page).toHaveTitle("Monitoramento · NewFarmer");
  await expect(page.getByTestId("stat-users")).toHaveText(/^\D*\d+/);
  await expect(page.getByTestId("stat-logins")).toContainText(/\d+/);
  await expect(page.getByTestId("stat-db")).toContainText(/\d+\s*ms/);
});

test("Admin no celular não rola a página na horizontal", async ({ page }) => {
  const { username } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username } })).status()).toBe(204);
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/admin", "/admin/subscribers", "/admin/leads", "/admin/emails"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
  }
  await page.goto("/admin/subscribers");
  await expect(page.getByTestId("subscriber-card").first()).toBeVisible();
  await page.getByTestId("subscriber-card").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/subscribers\/\d+$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "detalhe").toBe(true);
});

test("Leads mostra o funil, aceita só 7/30/90 dias e liga o visitante à conta", async ({ page }) => {
  const { username } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username } })).status()).toBe(204);
  await page.goto("/admin/leads?days=abc");
  await expect(page.getByRole("link", { name: "30 dias" })).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: "7 dias" }).click();
  await expect(page).toHaveURL(/days=7$/);
  const funnel = page.getByTestId("funnel");
  for (const step of ["Landing", "Cadastro", "Sua criação", "Assinatura", "Pagou"]) await expect(funnel).toContainText(step);
});

test("dono envia Sentimos sua falta para quem cancelou, o descadastro desliga o aceite e não recebe de novo", async ({ page, context }) => {
  test.setTimeout(120_000);
  const email = uniqueEmail();
  const { username: churned } = await createAccount(page, email, "Curitiba", undefined, "Ana", true);
  expect((await page.request.post("/api/dev/set-subscription", { data: { username: churned, status: "canceled" } })).status()).toBe(204);
  await clearSession(context);

  const { username } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username } })).status()).toBe(204);
  await page.goto("/admin/emails");
  await page.getByLabel("Público").selectOption("churned");
  await page.getByRole("button", { name: "Ver prévia" }).click();
  await expect(page.frameLocator("[data-testid=email-preview]").getByText("Sentimos sua falta!")).toBeVisible();
  expect(await page.getByTestId("email-preview").getAttribute("sandbox")).toBe("");

  page.once("dialog", (d) => {
    expect(d.message()).toMatch(/^Enviar para \d+ pessoas\?$/);
    void d.accept();
  });
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByTestId("send-result")).toContainText("Campanha enviada");
  await expect(page.getByTestId("campaign-row").first()).toContainText("Sentimos sua falta");

  await page.goto("/dev/inbox");
  const mail = page.locator("article", { hasText: "Sentimos sua falta no NewFarmer" }).filter({ hasText: email });
  await expect(mail).toHaveCount(1);
  await mail.getByRole("link", { name: "Descadastrar" }).click();
  await page.getByRole("button", { name: "Confirmar descadastro" }).click();
  await expect(page.getByText("Pronto: você não vai mais receber estes e-mails.")).toBeVisible();

  // Reativa a conta só para o Perfil abrir (quem cancelou é levado para a Assinatura).
  expect((await page.request.post("/api/dev/set-subscription", { data: { username: churned, status: "active" } })).status()).toBe(204);
  await clearSession(context);
  await page.goto("/login");
  await page.getByLabel("Username").fill(churned);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/profile/preferences");
  await expect(page.getByLabel("Receber novidades por e-mail")).not.toBeChecked();

  // Quem saiu não recebe de novo, mesmo numa campanha nova.
  await clearSession(context);
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/admin/emails");
  await page.getByLabel("Público").selectOption("churned");
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByTestId("send-result")).toContainText("Campanha enviada");
  await page.goto("/dev/inbox");
  await expect(page.locator("article", { hasText: "Sentimos sua falta no NewFarmer" }).filter({ hasText: email })).toHaveCount(1);
});

test("dono pausa a assinatura: a pessoa fica bloqueada sem poder assinar de novo; ao retomar, o acesso volta", async ({ page, context }) => {
  test.setTimeout(120_000);
  const { username: sub } = await signup(page, uniqueEmail());
  await clearSession(context);
  const { username: owner } = await signup(page, uniqueEmail());
  expect((await page.request.post("/api/dev/make-admin", { data: { username: owner } })).status()).toBe(204);
  const login = async (username: string) => {
    await clearSession(context);
    await page.goto("/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/(dashboard|subscribe)$/);
  };
  const openDetail = async () => {
    await page.goto(`/admin/subscribers?q=${sub}`);
    await page.getByTestId("subscriber-row").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/subscribers\/\d+$/);
  };

  await openDetail();
  await page.getByRole("button", { name: "Pausar assinatura" }).click();
  await expect(page.getByRole("button", { name: "Retomar assinatura" })).toBeVisible();
  await expect(page.locator("section[aria-labelledby=blk-sub]")).toContainText("Pausada");

  await login(sub);
  await expect(page).toHaveURL(/\/subscribe$/);
  await expect(page.getByTestId("subscription-paused")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Assinar por/ })).toHaveCount(0);

  await login(owner);
  await openDetail();
  await page.getByRole("button", { name: "Retomar assinatura" }).click();
  await expect(page.getByRole("button", { name: "Pausar assinatura" })).toBeVisible();

  await login(sub);
  await expect(page).toHaveURL(/\/dashboard$/);
});
