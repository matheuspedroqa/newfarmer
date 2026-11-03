import { afterEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/dev/make-admin/route";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

const pedido = () => new Request("http://localhost/api/dev/make-admin", { method: "POST", body: JSON.stringify({ username: "ana" }) });

afterEach(() => vi.unstubAllEnvs());

it("sem E2E=1 responde 404", async () => {
  vi.stubEnv("E2E", "");
  expect((await POST(pedido())).status).toBe(404);
});

it("em produção responde 404 mesmo com E2E=1", async () => {
  vi.stubEnv("E2E", "1");
  vi.stubEnv("NODE_ENV", "production");
  expect((await POST(pedido())).status).toBe(404);
});

it("com E2E=1 fora de produção liga o dono do site", async () => {
  vi.stubEnv("E2E", "1");
  const db = await testDb();
  vi.doMock("@/server/db", async (orig) => ({ ...(await orig<object>()), getDb: async () => db }));
  vi.resetModules();
  const { POST: post } = await import("@/app/api/dev/make-admin/route");
  await makeUser(db);
  expect((await post(pedido())).status).toBe(204);
  expect(await db.query("SELECT is_platform_admin FROM users")).toEqual([{ is_platform_admin: true }]);
});
