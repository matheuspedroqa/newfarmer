import { expect, test } from "@playwright/test";
import { captureAction, cookieHeader, openAs, replayAction, userOf } from "../helpers";

test.describe("controle de acesso", () => {
  test("sem login: telas do app e do Admin vão para a entrada", async ({ page }) => {
    for (const path of ["/dashboard", "/animals/cows", "/crops", "/weather", "/myfarm", "/profile", "/welcome", "/subscribe", "/admin", "/admin/subscribers", "/admin/leads", "/admin/emails", "/admin/activity", "/admin/monitoring"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login$/);
    }
  });

  test("assinante comum recebe 404 em todas as telas do Admin", async ({ browser }) => {
    const page = await openAs(browser, "paidA");
    for (const path of ["/admin", "/admin/subscribers", "/admin/subscribers/1", "/admin/leads", "/admin/emails", "/admin/activity", "/admin/monitoring"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
    await page.goto("/dashboard");
    await page.getByTestId("user-menu-button").click();
    await expect(page.getByRole("menuitem", { name: "Admin" })).toHaveCount(0);
  });

  test("trava de assinatura não cai com pedido direto ao servidor (RSC/prefetch)", async ({ request }) => {
    for (const path of ["/dashboard", "/animals/cows?tab=diary", "/weather"]) {
      const res = await request.get(path, { headers: { cookie: cookieHeader("unpaid"), RSC: "1", "Next-Router-Prefetch": "1" }, maxRedirects: 0 });
      const body = await res.text();
      expect(body, path).not.toContain("plant-this-month");
      expect(body, path).not.toContain("Salvar anotação");
      expect(body, path).not.toContain("day-card");
    }
  });

  test("IDOR e CSRF: a conta B não apaga a anotação da A, nem a própria A vindo de outro site", async ({ browser, request }) => {
    const a = await openAs(browser, "paidA");
    await a.goto("/animals/cows?tab=diary");
    const note = `Alvo IDOR ${Date.now()}`;
    await a.getByLabel("Anotação", { exact: true }).fill(note);
    await a.getByRole("button", { name: "Salvar anotação" }).click();
    const entry = a.getByTestId("diary-entry").filter({ hasText: note });
    await expect(entry).toHaveCount(1);
    const cap = await captureAction(a, () => entry.getByRole("button", { name: "Apagar anotação" }).click());

    await replayAction(request, cap, "paidB");
    await a.goto("/animals/cows?tab=diary");
    await expect(entry, "a conta B conseguiu apagar a anotação da conta A").toHaveCount(1);

    await replayAction(request, cap, "paidA", "https://site-malicioso.example");
    await a.goto("/animals/cows?tab=diary");
    await expect(entry, "pedido de outro site (CSRF) apagou a anotação").toHaveCount(1);

    // Controle: o mesmo pedido, da dona e pelo próprio site, apaga (prova que os de cima eram válidos).
    await replayAction(request, cap, "paidA");
    await a.goto("/animals/cows?tab=diary");
    await expect(entry).toHaveCount(0);
  });

  test("escalada de privilégio: assinante comum não pausa a assinatura de ninguém com a ação do Admin", async ({ browser, request }) => {
    const admin = await openAs(browser, "admin");
    await admin.goto(`/admin/subscribers?q=${userOf("paidA").username}`);
    await admin.goto((await admin.getByTestId("subscriber-row").getByRole("link").first().getAttribute("href"))!);
    const cap = await captureAction(admin, () => admin.getByRole("button", { name: "Pausar assinatura" }).click());

    for (const who of ["paidB", "unpaid"] as const) await replayAction(request, cap, who);
    await admin.reload();
    await expect(admin.locator("section[aria-labelledby=blk-sub]")).toContainText("Ativa");
    await expect(admin.getByRole("button", { name: "Pausar assinatura" })).toBeVisible();
  });
});
