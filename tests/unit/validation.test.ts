import { describe, expect, it } from "vitest";
import { cancelSchema, loginSchema, resetSchema, signupSchema, toFieldErrors } from "@/lib/validation";

const city = { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" };
const valid = { name: "Ana", email: "ana@exemplo.com", username: "ana", password: "segredo123", confirmPassword: "segredo123", city, terms: "on" };

function errorsOf(schema: typeof signupSchema | typeof loginSchema | typeof resetSchema, data: unknown) {
  const r = schema.safeParse(data);
  if (r.success) return {};
  return toFieldErrors(r.error);
}

describe("signupSchema", () => {
  it("aceita dados válidos e normaliza o e-mail", () => {
    const r = signupSchema.parse({ ...valid, email: "  Ana@Exemplo.COM " });
    expect(r.email).toBe("ana@exemplo.com");
  });

  it("campo vazio → required", () => {
    expect(errorsOf(signupSchema, { ...valid, name: "  " }).name).toBe("required");
    expect(errorsOf(signupSchema, { ...valid, email: "" }).email).toBe("required");
    expect(errorsOf(signupSchema, { ...valid, password: "", confirmPassword: "" }).password).toBe("required");
  });

  it("e-mail inválido", () => {
    expect(errorsOf(signupSchema, { ...valid, email: "ana@" }).email).toBe("emailInvalid");
  });

  it("senha curta e senha longa", () => {
    expect(errorsOf(signupSchema, { ...valid, password: "1234567", confirmPassword: "1234567" }).password).toBe(
      "passwordTooShort",
    );
    const long = "a".repeat(129);
    expect(errorsOf(signupSchema, { ...valid, password: long, confirmPassword: long }).password).toBe(
      "passwordTooLong",
    );
  });

  it("senhas diferentes → erro na confirmação", () => {
    expect(errorsOf(signupSchema, { ...valid, confirmPassword: "outra-senha" }).confirmPassword).toBe(
      "passwordsDontMatch",
    );
  });

  it("cidade não escolhida → cityRequired", () => {
    expect(errorsOf(signupSchema, { ...valid, city: null }).city).toBe("cityRequired");
  });

  it("username: normaliza, recusa inválido e reservado", () => {
    expect(signupSchema.parse({ ...valid, username: "  AnaSilva " }).username).toBe("anasilva");
    expect(errorsOf(signupSchema, { ...valid, username: "ab" }).username).toBe("usernameInvalid");
    expect(errorsOf(signupSchema, { ...valid, username: "12345" }).username).toBe("usernameInvalid");
    expect(errorsOf(signupSchema, { ...valid, username: "Admin" }).username).toBe("usernameReserved");
    expect(errorsOf(signupSchema, { ...valid, username: undefined }).username).toBe("usernameInvalid");
  });

  it("nome com mais de 80 letras → tooLong", () => {
    expect(errorsOf(signupSchema, { ...valid, name: "a".repeat(81) }).name).toBe("tooLong");
  });

  it("sem aceitar os Termos → termsRequired", () => {
    expect(errorsOf(signupSchema, { ...valid, terms: null }).terms).toBe("termsRequired");
    expect(errorsOf(signupSchema, { ...valid, terms: "off" }).terms).toBe("termsRequired");
  });
});

describe("loginSchema", () => {
  it("senha vazia → required", () => {
    expect(errorsOf(loginSchema, { username: "ana", password: "" }).password).toBe("required");
  });

  it("pede username, não e-mail", () => {
    expect(loginSchema.parse({ username: "ana", password: "x" })).toEqual({ username: "ana", password: "x" });
    expect(errorsOf(loginSchema, { username: "", password: "x" }).username).toBe("required");
  });
});

describe("resetSchema", () => {
  it("senhas diferentes → erro na confirmação", () => {
    expect(
      errorsOf(resetSchema, { token: "t", password: "segredo123", confirmPassword: "segredo124" }).confirmPassword,
    ).toBe("passwordsDontMatch");
  });
});

describe("changePasswordSchema", () => {
  it("exige a senha atual e aplica as regras da nova senha", async () => {
    const { changePasswordSchema } = await import("@/lib/validation");
    const errors = (data: unknown) => {
      const r = changePasswordSchema.safeParse(data);
      return r.success ? {} : toFieldErrors(r.error);
    };
    expect(errors({ currentPassword: "", password: "segredo123", confirmPassword: "segredo123" }).currentPassword).toBe("required");
    expect(errors({ currentPassword: "x", password: "123", confirmPassword: "123" }).password).toBe("passwordTooShort");
    expect(errors({ currentPassword: "x", password: "segredo123", confirmPassword: "outra" }).confirmPassword).toBe("passwordsDontMatch");
    expect(changePasswordSchema.safeParse({ currentPassword: "x", password: "segredo123", confirmPassword: "segredo123" }).success).toBe(true);
  });
});

describe("cancelSchema", () => {
  it("pede um motivo da lista e o texto só em Outro", () => {
    expect(cancelSchema.safeParse({ reason: "price", details: "" }).success).toBe(true);
    expect(cancelSchema.safeParse({ reason: "", details: "" }).success).toBe(false);
    expect(cancelSchema.safeParse({ reason: "hack", details: "" }).success).toBe(false);
    expect(cancelSchema.safeParse({ reason: "other", details: "  " }).success).toBe(false);
    expect(cancelSchema.safeParse({ reason: "other", details: "Mudei de cidade" }).success).toBe(true);
    expect(cancelSchema.safeParse({ reason: "price", details: "x".repeat(1001) }).success).toBe(false);
  });
});
