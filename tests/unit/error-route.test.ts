import { expect, it } from "vitest";
import { errorRoute } from "@/lib/error-route";

it("guarda o padrão da rota, nunca o caminho com token", () => {
  const request = { path: "/recuperar/abc123segredo?x=1", method: "GET", headers: {} };
  const rota = errorRoute({ routePath: "/recuperar/[token]" });
  expect(rota).toBe("/recuperar/[token]");
  expect(rota).not.toContain("abc123segredo");
  expect(request.path).toContain("abc123segredo"); // o caminho real nem é lido
});

it("sem routePath guarda 'unknown'", () => {
  expect(errorRoute({})).toBe("unknown");
});
