import { expect, test } from "@playwright/test";

test("sem consentimento nada é gravado; com 'Aceitar todos' grava sem query; 'Só os essenciais' para", async ({ page, context, request }) => {
  const stored = async (visitor: string) =>
    ((await (await request.get(`/api/dev/page-views?visitor=${visitor}`)).json()) as { path: string }[]).map((r) => r.path);

  // O servidor recusa mesmo que o navegador insista: nf_vid sem nf_consent=all não grava.
  const forged = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
  const res = await request.post("/api/track", { headers: { cookie: `nf_vid=${forged}; nf_consent=essential` }, data: { path: "/x" } });
  expect(res.status()).toBe(204);
  expect(await stored(forged)).toEqual([]);

  // Sem escolha: o aviso aparece e navegar não cria nem visitante nem visita.
  await context.clearCookies();
  await context.addCookies([{ name: "nf_locale", value: "pt", domain: "localhost", path: "/" }]);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Aceitar todos" })).toBeVisible();
  await page.goto("/login");
  await page.goto("/terms");
  expect((await context.cookies()).some((c) => c.name === "nf_vid")).toBe(false);

  await page.getByRole("button", { name: "Aceitar todos" }).click();
  await page.waitForLoadState("load");
  await page.goto("/login?token=segredo");
  await page.goto("/terms");
  const vid = (await context.cookies()).find((c) => c.name === "nf_vid")!.value;
  await expect.poll(() => stored(vid)).toEqual(["/terms", "/login", "/terms"]);

  await page.getByRole("button", { name: "Preferências de cookies" }).click();
  await page.getByRole("button", { name: "Só os essenciais" }).click();
  await page.waitForLoadState("load");
  await page.goto("/privacy");
  await page.waitForTimeout(1000);
  expect(await stored(vid)).toHaveLength(3);
});
