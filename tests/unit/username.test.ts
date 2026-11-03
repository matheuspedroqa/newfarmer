import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameProblem } from "@/lib/username";

describe("username", () => {
  it.each(["ana", "ana.silva", "ana_2", "joao-da-roca"])("%j é válido", (u) => expect(usernameProblem(u)).toBeNull());
  it.each(["ab", "a".repeat(31), "ana silva", "ána", "ana@x", "12345"])("%j é inválido", (u) =>
    expect(usernameProblem(u)).toBe("usernameInvalid"));
  it.each(["admin", "Admin", "newfarmer", "support"])("%j é reservado", (u) =>
    expect(usernameProblem(normalizeUsername(u))).toBe("usernameReserved"));
  it("guarda em minúsculas e sem espaços nas pontas", () => expect(normalizeUsername("  AnaSilva ")).toBe("anasilva"));
});
