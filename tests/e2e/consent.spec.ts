import { expect, request as pwRequest, test } from "@playwright/test";

const VID = crypto.randomUUID(); // o banco do robô persiste entre execuções

test("o servidor não grava sem consentimento 'all', com corpo grande ou caminho proibido", async ({ request, baseURL }) => {
  const stored = async (visitor: string) =>
    ((await (await request.get(`/api/dev/page-views?visitor=${visitor}`)).json()) as { path: string }[]).map((r) => r.path);
  // Contexto limpo: o `request` padrão herdaria nf_consent=essential do storageState.
  const send = async (cookie: string | undefined, data: unknown) => {
    const ctx = await pwRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] }, extraHTTPHeaders: cookie ? { cookie } : {} });
    const res = await ctx.post("/api/track", { data });
    await ctx.dispose();
    return res.status();
  };
  const vid = VID;
  expect(await send(`nf_vid=${vid}`, { path: "/sem-consent" })).toBe(204); // consentimento ausente
  expect(await send(`nf_vid=${vid}; nf_consent=essential`, { path: "/essencial" })).toBe(204);
  expect(await send(`nf_vid=nao-e-uuid; nf_consent=all`, { path: "/vid-ruim" })).toBe(204);
  expect(await send(`nf_vid=${vid}; nf_consent=all`, { path: "/" + "a".repeat(5000) })).toBe(204); // corpo grande
  expect(await send(`nf_vid=${vid}; nf_consent=all`, { path: "/admin/leads" })).toBe(204);
  expect(await stored(vid)).toEqual([]);
  // Controle: com consentimento e dados certos, grava (prova que o 204 acima não é um endpoint quebrado).
  expect(await send(`nf_vid=${vid}; nf_consent=all`, { path: "/ok?token=x" })).toBe(204);
  expect(await stored(vid)).toEqual(["/ok"]);
});

test("navegador: sem escolha nada é gravado; 'Aceitar todos' grava sem query; 'Só os essenciais' para", async ({ page, context, request }) => {
  const stored = async (visitor: string) =>
    ((await (await request.get(`/api/dev/page-views?visitor=${visitor}`)).json()) as { path: string }[]).map((r) => r.path);
  const tracked = (path: string) =>
    page.waitForResponse((r) => r.url().endsWith("/api/track") && r.request().postData()?.includes(`"path":"${path}"`) === true);

  await context.clearCookies();
  await context.addCookies([{ name: "nf_locale", value: "pt", domain: "localhost", path: "/" }]);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Aceitar todos" })).toBeVisible();
  await page.goto("/login");
  await page.goto("/terms");
  expect((await context.cookies()).some((c) => c.name === "nf_vid")).toBe(false);

  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Aceitar todos" }).click()]);
  await expect(page.getByRole("button", { name: "Aceitar todos" })).toHaveCount(0);
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "nf_vid")?.value).toBeTruthy();
  const vid = (await context.cookies()).find((c) => c.name === "nf_vid")!.value;
  await Promise.all([tracked("/login"), page.goto("/login?token=segredo")]);
  await Promise.all([tracked("/terms"), page.goto("/terms")]);
  // A ordem de gravação de beacons seguidos não é garantida: compara ordenado.
  await expect.poll(async () => (await stored(vid)).sort()).toEqual(["/login", "/terms", "/terms"]);

  await page.getByRole("button", { name: "Preferências de cookies" }).click();
  await expect(page.getByRole("button", { name: "Só os essenciais" })).toBeVisible();
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Só os essenciais" }).click()]);
  expect((await context.cookies()).some((c) => c.name === "nf_vid")).toBe(false);
  await page.goto("/privacy");
  expect(await stored(vid)).toHaveLength(3);
});
