import { describe, expect, it } from "vitest";
import { getUserById } from "@/server/accounts";
import { VERIFY_RESEND_WAIT_MS, VERIFY_TTL_MS, confirmEmail, sendVerificationEmail } from "@/server/email-verification";
import type { MailMessage, Mailer } from "@/server/mailer";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

function captureMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (m) => void sent.push(m) };
  return { sent, mailer };
}

const tokenFrom = (m: MailMessage) => m.html.match(/\/confirmar\/([A-Za-z0-9_-]+)/)![1];
const base = { baseUrl: "http://localhost:3000", locale: "pt" as const };

describe("confirmação de e-mail", () => {
  it("conta nova começa sem confirmar; o link do e-mail confirma", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    expect((await getUserById(db, id))!.emailVerified).toBe(false);

    const { sent, mailer } = captureMailer();
    expect(await sendVerificationEmail(db, mailer, { ...base, userId: id })).toBe("sent");
    expect(sent[0]).toMatchObject({ to: "ana@exemplo.com", subject: "Confirme seu e-mail no NewFarmer" });

    expect(await confirmEmail(db, tokenFrom(sent[0]))).toBe("ok");
    expect((await getUserById(db, id))!.emailVerified).toBe(true);
  });

  it("clicar de novo no mesmo link continua dizendo que deu certo (antivírus de e-mail abre links antes)", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const { sent, mailer } = captureMailer();
    await sendVerificationEmail(db, mailer, { ...base, userId: id });
    await confirmEmail(db, tokenFrom(sent[0]));
    expect(await confirmEmail(db, tokenFrom(sent[0]))).toBe("ok");
  });

  it("link vencido ou inventado não confirma", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const { sent, mailer } = captureMailer();
    await sendVerificationEmail(db, mailer, { ...base, userId: id }, 0);
    expect(await confirmEmail(db, tokenFrom(sent[0]), VERIFY_TTL_MS + 1)).toBe("expired");
    expect(await confirmEmail(db, "inventado")).toBe("expired");
    expect((await getUserById(db, id))!.emailVerified).toBe(false);
  });

  it("reenviar: espera 1 minuto entre pedidos e não envia para quem já confirmou", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const { sent, mailer } = captureMailer();
    expect(await sendVerificationEmail(db, mailer, { ...base, userId: id }, 1000)).toBe("sent");
    expect(await sendVerificationEmail(db, mailer, { ...base, userId: id }, 2000)).toBe("tooSoon");
    expect(await sendVerificationEmail(db, mailer, { ...base, userId: id }, 1000 + VERIFY_RESEND_WAIT_MS)).toBe("sent");
    await confirmEmail(db, tokenFrom(sent[1]), 1000 + VERIFY_RESEND_WAIT_MS);
    expect(await sendVerificationEmail(db, mailer, { ...base, userId: id }, 10 * VERIFY_RESEND_WAIT_MS)).toBe("alreadyVerified");
    expect(sent).toHaveLength(2);
  });
});
