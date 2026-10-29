import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/cookies";

describe("ambiente de testes", () => {
  it("resolve o alias @/", () => {
    expect(SESSION_COOKIE).toBe("nf_session");
  });
});
