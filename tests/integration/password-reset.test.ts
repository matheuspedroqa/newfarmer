import { describe, expect, it } from "vitest";
import { listActivity } from "@/server/activity-log";
import { verifyCredentials } from "@/server/accounts";
import { createDevInboxMailer, listDevEmails, type MailMessage, type Mailer } from "@/server/mailer";
import { RESET_TTL_MS, requestPasswordReset, resetPassword } from "@/server/password-reset";
import { createSession, getSessionUser } from "@/server/sessions";
import { testDb } from "../helpers/db";
import { DEFAULT_PASSWORD, makeUser } from "../helpers/users";

function captureMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (m) => void sent.push(m) };
  return { sent, mailer };
}

function tokenFrom(message: MailMessage): string {
  const match = message.html.match(/\/reset-password\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("link não encontrado no e-mail");
  return match[1];
}

const base = { baseUrl: "http://localhost:3000", locale: "pt" as const };

describe("requestPasswordReset", () => {
  it("envia um e-mail com link para quem tem conta", async () => {
    const db = await testDb();
    await makeUser(db);
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier: "ANA@exemplo.com" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@exemplo.com");
    expect(sent[0].subject).toBe("Recupere sua senha do NewFarmer");
    expect(sent[0].html).toContain("http://localhost:3000/reset-password/");
  });

  it("usa o idioma pedido", async () => {
    const db = await testDb();
    await makeUser(db);
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier: "ana@exemplo.com", locale: "en" });
    expect(sent[0].subject).toBe("Recover your NewFarmer password");
  });

  it("não envia nada nem dá erro para e-mail sem conta", async () => {
    const db = await testDb();
    const { sent, mailer } = captureMailer();
    await expect(requestPasswordReset(db, mailer, { ...base, identifier: "nao@existe.com" })).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("protege o e-mail contra nomes com código", async () => {
    const db = await testDb();
    await makeUser(db, { name: "<script>alert(1)</script>" });
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier: "ana@exemplo.com" });
    expect(sent[0].html).not.toContain("<script>");
    expect(sent[0].html).toContain("&lt;script&gt;");
  });
});

describe("resetPassword", () => {
  async function setup() {
    const db = await testDb();
    const userId = await makeUser(db);
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier: "ana@exemplo.com" }, 0);
    return { db, userId, token: tokenFrom(sent[0]) };
  }

  it("troca a senha com um link válido", async () => {
    const { db, token } = await setup();
    expect(await resetPassword(db, { token, password: "nova-senha-1" }, 1000)).toBe("ok");
    expect((await verifyCredentials(db, "ana", "nova-senha-1")).ok).toBe(true);
    expect((await verifyCredentials(db, "ana", DEFAULT_PASSWORD)).ok).toBe(false);
  });

  it("o link só funciona uma vez", async () => {
    const { db, token } = await setup();
    await resetPassword(db, { token, password: "nova-senha-1" }, 1000);
    expect(await resetPassword(db, { token, password: "nova-senha-2" }, 2000)).toBe("expired");
  });

  it("o link vence depois de 1 hora", async () => {
    const { db, token } = await setup();
    expect(await resetPassword(db, { token, password: "nova-senha-1" }, RESET_TTL_MS + 1)).toBe("expired");
  });

  it("link inventado não funciona", async () => {
    const { db } = await setup();
    expect(await resetPassword(db, { token: "inventado", password: "nova-senha-1" })).toBe("expired");
  });

  it("trocar a senha desconecta as sessões abertas", async () => {
    const { db, userId, token } = await setup();
    const session = await createSession(db, userId);
    await resetPassword(db, { token, password: "nova-senha-1" }, 1000);
    expect(await getSessionUser(db, session)).toBeNull();
  });
});

describe("caixa de e-mail de teste", () => {
  it("guarda os e-mails e lista do mais novo para o mais antigo", async () => {
    const db = await testDb();
    const mailer = createDevInboxMailer(db);
    await mailer.send({ to: "a@x.com", subject: "primeiro", html: "<p>1</p>" });
    await mailer.send({ to: "b@x.com", subject: "segundo", html: "<p>2</p>" });
    expect((await listDevEmails(db)).map((e) => e.subject)).toEqual(["segundo", "primeiro"]);
  });
});

describe("requestPasswordReset por username ou e-mail", () => {
  it.each(["ana", "ANA", "ana@exemplo.com"])("recuperar a senha com %j envia o link para o e-mail da conta", async (identifier) => {
    const db = await testDb();
    await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier });
    expect(sent.map((m) => m.to)).toEqual(["ana@exemplo.com"]);
  });

  it("username sem conta não envia nada", async () => {
    const db = await testDb();
    const { sent, mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier: "ninguem" });
    expect(sent).toHaveLength(0);
  });

  it("registra a atividade só quando o e-mail é enviado", async () => {
    const db = await testDb();
    const id = await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
    const { mailer } = captureMailer();
    await requestPasswordReset(db, mailer, { ...base, identifier: "ninguem", ip: "1.2.3.4" });
    await requestPasswordReset(db, mailer, { ...base, identifier: "ana", ip: "1.2.3.4" });
    const log = await listActivity(db, { action: "auth.passwordReset" });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ userId: id, target: "ana", ip: "1.2.3.4" });
  });
});
