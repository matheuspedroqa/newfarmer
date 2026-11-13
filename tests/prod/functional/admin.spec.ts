import { expect, test, type Page } from "@playwright/test";
import { openAs, userOf } from "../helpers";

test.describe("Admin (sua conta)", () => {
  let page: Page;
  test.beforeEach(async ({ browser }) => {
    page = await openAs(browser, "admin");
  });

  const openDetail = async (username: string) => {
    await page.goto(`/admin/subscribers?q=${username}`);
    await page.getByTestId("subscriber-row").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/admin\/subscribers\/\d+$/);
  };

  test("Visão geral e as abas abrem", async () => {
    await page.goto("/admin");
    await expect(page.getByText("Assinantes ativos")).toBeVisible();
    for (const [name, url] of [["Assinantes", "/admin/subscribers"], ["Leads", "/admin/leads"], ["E-mails", "/admin/emails"], ["Activity logs", "/admin/activity"], ["Monitoramento", "/admin/monitoring"]]) {
      await page.getByRole("navigation", { name: "Seções do Admin" }).getByRole("link", { name }).click();
      await expect(page, name).toHaveURL(new RegExp(`${url}$`));
    }
  });

  test("Assinantes: busca, filtro de status e ficha com a criação", async () => {
    const a = userOf("paidA");
    await page.goto(`/admin/subscribers?q=${a.username}`);
    await expect(page.getByTestId("subscriber-row")).toHaveCount(1);
    await page.goto(`/admin/subscribers?q=${a.username}&status=active`);
    await expect(page.getByTestId("subscriber-row")).toHaveCount(1);
    await page.goto(`/admin/subscribers?q=${a.username}&status=canceled`);
    await expect(page.getByTestId("subscriber-row")).toHaveCount(0);
    await openDetail(a.username);
    await expect(page.getByTestId("detail-account")).toContainText(a.email);
    await expect(page.getByTestId("detail-farm")).toContainText("Vacas");
    await expect(page.locator("section[aria-labelledby=blk-sub]")).toContainText("Ativa");
  });

  test("Pausar assinatura bloqueia a conta B sem deixar assinar de novo; Retomar devolve o acesso", async ({ browser }) => {
    const b = userOf("paidB");
    await openDetail(b.username);
    await page.getByRole("button", { name: "Pausar assinatura" }).click();
    const failed = page.getByText("Não deu para falar com a Stripe");
    await expect(page.getByRole("button", { name: "Retomar assinatura" }).or(failed)).toBeVisible();
    expect(await failed.count(), "A Stripe recusou: a chave restrita precisa de Subscriptions = Write").toBe(0);
    try {
      const pb = await openAs(browser, "paidB");
      await pb.goto("/dashboard");
      await expect(pb).toHaveURL(/\/subscribe$/);
      await expect(pb.getByTestId("subscription-paused")).toBeVisible();
      await expect(pb.getByRole("button", { name: /^(Assinar por|Testar 3 dias)/ })).toHaveCount(0);
      await pb.goto("/profile/subscription");
      await expect(pb.getByTestId("billing-card")).toContainText("Pausada");
      await pb.context().close();
    } finally {
      await openDetail(b.username);
      const resume = page.getByRole("button", { name: "Retomar assinatura" });
      if (await resume.count()) await resume.click();
      await expect(page.getByRole("button", { name: "Pausar assinatura" })).toBeVisible();
    }
    const pb = await openAs(browser, "paidB");
    await pb.goto("/dashboard");
    await expect(pb).toHaveURL(/\/dashboard$/);
  });

  test("Leads: períodos 7/30/90, funil e coluna Local; valor inventado volta para 30 dias", async () => {
    for (const d of [7, 30, 90]) {
      await page.goto(`/admin/leads?days=${d}`);
      await expect(page.getByRole("link", { name: `${d} dias` })).toHaveAttribute("aria-current", "true");
      await expect(page.getByTestId("funnel")).toBeVisible();
    }
    await page.goto("/admin/leads?days=999");
    await expect(page.getByRole("link", { name: "30 dias" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator("thead")).toContainText("Local");
    await expect(page.getByTestId("lead-row").filter({ hasText: userOf("paidA").username })).toHaveCount(1);
  });

  test("E-mails: públicos com contagem e prévia (não envia nada para clientes)", async () => {
    await page.goto("/admin/emails");
    const options = await page.getByLabel("Público").locator("option").allInnerTexts();
    expect(options.join(" ")).toMatch(/Todos \(\d+\)/);
    await page.getByLabel("Público").selectOption("all");
    await page.getByRole("button", { name: "Ver prévia" }).click();
    await expect(page.frameLocator("[data-testid=email-preview]").getByText("Sentimos sua falta!")).toBeVisible();
    expect(await page.getByTestId("email-preview").getAttribute("sandbox")).toBe("");
  });

  test("Activity logs mostra a pausa feita pelo teste e Monitoramento abre", async () => {
    await page.goto("/admin/activity");
    await expect(page.getByTestId("activity-row").first()).toBeVisible();
    await expect(page.getByTestId("activity-row").filter({ hasText: /Pausou uma assinatura|Retomou uma assinatura/ }).first()).toBeVisible();
    await page.goto("/admin/monitoring");
    await expect(page.getByText("Tempo de resposta do banco")).toBeVisible();
  });
});
