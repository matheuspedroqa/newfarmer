import { existsSync } from "node:fs";
import { test as teardown } from "@playwright/test";
import { deleteAccount, readRun } from "../helpers";

// Apaga só as contas criadas pelos testes (a do admin nunca entra nessa lista, e deleteAccount recusa).
teardown("apaga as contas de teste da rodada", async ({ browser }) => {
  teardown.setTimeout(10 * 60_000);
  const left: string[] = [];
  for (const [key, user] of Object.entries(readRun().users)) {
    if (!user.storage || !existsSync(user.storage)) {
      left.push(`${key} (${user.username}): sem sessão salva`);
      continue;
    }
    const ctx = await browser.newContext({ storageState: user.storage });
    const page = await ctx.newPage();
    try {
      if (!(await deleteAccount(page, user))) {
        // Sessão encerrada (ex.: teste de Sair): entra com a senha e apaga. Se a conta já não existe, o login falha e está tudo certo.
        await page.goto("/login");
        await page.getByLabel("Username").fill(user.username);
        await page.getByLabel("Senha").fill(user.password);
        await page.getByRole("button", { name: "Entrar" }).click();
        await page.waitForURL(/\/(dashboard|subscribe|welcome)$/, { timeout: 15_000 }).catch(() => undefined);
        if (page.url().endsWith("/login")) continue;
        await deleteAccount(page, user);
      }
    } catch (e) {
      left.push(`${key} (${user.username}): ${(e as Error).message}`);
    } finally {
      await ctx.close();
    }
  }
  if (left.length) console.log("Contas de teste que podem ter ficado (apague em Admin > Assinantes se aparecerem):\n- " + left.join("\n- "));
});
