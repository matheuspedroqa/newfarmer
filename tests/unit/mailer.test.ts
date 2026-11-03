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
      body: JSON.stringify({ from: "NewFarmer <oi@newfarmer.app>", ...message }),
    });
  });

  it("avisa quando o Resend recusa", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 403 }));
    await expect(createResendMailer("re_x", "a@b.c", fetchFn).send(message)).rejects.toThrow("403");
  });

  it("online sem chave do Resend falha em vez de fingir que enviou", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getMailer({} as Db)).toThrow("RESEND_API_KEY");
  });
});
