import { afterEach, describe, expect, it, vi } from "vitest";
import { createResendMailer, getMailer } from "@/server/mailer";
import type { Db } from "@/server/db";

const message = { to: "ana@exemplo.com", subject: "Oi", html: "<p>link</p>" };

describe("e-mail pelo Resend", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("envia para a API do Resend com a chave no cabeçalho", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await createResendMailer("re_chave", "NewFarmer <oi@newfarmer.app>", fetchFn).send(message);
    expect(fetchFn).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer re_chave", "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewFarmer <oi@newfarmer.app>", ...message, reply_to: "contact@newfarmer.app" }),
      signal: expect.any(AbortSignal),
    });
  });

  it("avisa quando o Resend recusa", async () => {
    // Só o código do erro vai junto; a mensagem (que pode ter o e-mail da pessoa) não.
    const fetchFn = vi.fn(async () => new Response('{"name":"validation_error","message":"ana@exemplo.com"}', { status: 403 }));
    await expect(createResendMailer("re_x", "a@b.c", fetchFn).send(message)).rejects.toThrow(/^Resend respondeu 403 validation_error$/);
  });

  it("online sem chave do Resend falha em vez de fingir que enviou", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getMailer({} as Db)).toThrow("RESEND_API_KEY");
  });
});

describe("e-mail pelo Resend: remetente, reply_to e cabeçalhos", () => {
  afterEach(() => vi.unstubAllEnvs());
  const bodyOf = (fetchFn: ReturnType<typeof vi.fn>) => JSON.parse((fetchFn.mock.calls[0] as unknown as [string, { body: string }])[1].body);

  it("marketing usa o próprio remetente, cabeçalhos e reply_to", async () => {
    vi.stubEnv("MAIL_REPLY_TO", "suporte@newfarmer.app");
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await createResendMailer("k", "Conta <conta@nf.app>", fetchFn).send({ ...message, from: "Novidades <n@nf.app>", headers: { "List-Unsubscribe": "<u>" } });
    expect(bodyOf(fetchFn)).toMatchObject({ from: "Novidades <n@nf.app>", reply_to: "suporte@newfarmer.app", headers: { "List-Unsubscribe": "<u>" } });
  });

  it("sem as variáveis, as respostas vão para contact@newfarmer.app", async () => {
    vi.stubEnv("MAIL_REPLY_TO", "");
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await createResendMailer("k", "Conta <conta@nf.app>", fetchFn).send(message);
    expect(bodyOf(fetchFn)).toEqual({ from: "Conta <conta@nf.app>", ...message, reply_to: "contact@newfarmer.app" });
  });
});
