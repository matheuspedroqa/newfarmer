import { describe, expect, it } from "vitest";
import { loginSchema, resetSchema, signupSchema, toFieldErrors } from "@/lib/validation";

const city = { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" };
const valid = { name: "Ana", email: "ana@exemplo.com", password: "segredo123", confirmPassword: "segredo123", city };

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

  it("nome com mais de 80 letras → tooLong", () => {
    expect(errorsOf(signupSchema, { ...valid, name: "a".repeat(81) }).name).toBe("tooLong");
  });
});

describe("loginSchema", () => {
  it("senha vazia → required", () => {
    expect(errorsOf(loginSchema, { email: "ana@exemplo.com", password: "" }).password).toBe("required");
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
