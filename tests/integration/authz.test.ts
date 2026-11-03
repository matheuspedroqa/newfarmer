import { beforeEach, expect, it, vi } from "vitest";

const user = { isPlatformAdmin: false };
vi.mock("@/server/current-user", () => ({ requireUser: async () => user }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { requirePlatformAdmin } = await import("@/server/authz");

beforeEach(() => {
  user.isPlatformAdmin = false;
});

it("quem não é dono do site recebe 404", async () => {
  await expect(requirePlatformAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
});

it("dono do site passa e recebe o usuário", async () => {
  user.isPlatformAdmin = true;
  await expect(requirePlatformAdmin()).resolves.toBe(user);
});
