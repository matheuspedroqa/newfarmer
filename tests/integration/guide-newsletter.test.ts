import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import { confirmGuide, guideMonthlyEmail, sendMonthlyGuides, subscribeToGuide } from "@/server/guide-newsletter";
import type { MailMessage, Mailer } from "@/server/mailer";
import { unsubscribeAttempt } from "@/server/marketing";
import { testDb } from "../helpers/db";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

const DAY = 86_400_000;
const NOV = Date.UTC(2026, 10, 6);
const recorder = (failTo?: string) => {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    async send(m) {
      if (m.to === failTo) throw new Error("falhou");
      sent.push(m);
    },
  };
  return { sent, mailer };
};
const tokenOf = (m: MailMessage) => /confirm-guide\/([\w-]+)/.exec(m.html)![1];
const send = (mailer: Mailer, now = NOV) => sendMonthlyGuides(db, mailer, { appUrl: "http://x", now, pauseMs: 0 });

describe("calendário mensal por e-mail", { timeout: 30_000 }, () => {
  it("só recebe quem confirmou; pedir de novo reenvia a confirmação, já confirmado não recebe nada", async () => {
    const { sent, mailer } = recorder();
    await subscribeToGuide(db, mailer, { email: "a@x.com", country: "ES", locale: "es", appUrl: "http://x" }, NOV);
    await subscribeToGuide(db, mailer, { email: "a@x.com", country: "ES", locale: "es", appUrl: "http://x" }, NOV);
    expect(sent.map((m) => m.subject)).toEqual(["Confirma para recibir qué plantar cada mes", "Confirma para recibir qué plantar cada mes"]);
    expect(tokenOf(sent[0])).toBe(tokenOf(sent[1]));
    expect(sent[0].html).toContain("en España");

    expect((await send(mailer)).sent).toBe(0); // ainda não confirmou
    expect(await confirmGuide(db, tokenOf(sent[0]), NOV)).toBe("es");
    expect(await confirmGuide(db, "inventado")).toBeNull();
    await subscribeToGuide(db, mailer, { email: "a@x.com", country: "ES", locale: "es", appUrl: "http://x" }, NOV);
    expect(sent).toHaveLength(2);
  });

  it("manda uma vez por mês, solta a reserva quando falha e apaga pedido não confirmado depois de 30 dias", async () => {
    const { sent, mailer } = recorder();
    for (const email of ["a@x.com", "b@x.com", "velho@x.com"]) await subscribeToGuide(db, mailer, { email, country: "BR", locale: "pt", appUrl: "http://x" }, email === "velho@x.com" ? NOV - 31 * DAY : NOV);
    await confirmGuide(db, tokenOf(sent[0]));
    await confirmGuide(db, tokenOf(sent[1]));
    sent.length = 0;

    const broken = recorder("b@x.com");
    expect(await send(broken.mailer)).toEqual({ sent: 1, failed: 1 });
    expect(broken.sent[0]).toMatchObject({ to: "a@x.com", subject: "O que plantar em novembro no Brasil" });
    expect(broken.sent[0].headers?.["List-Unsubscribe"]).toMatch(/^<http:\/\/x\/api\/unsubscribe\/[\w-]+>$/);
    expect(await send(mailer)).toEqual({ sent: 1, failed: 0 }); // só quem falhou
    expect(sent[0].to).toBe("b@x.com");
    expect(await send(mailer)).toEqual({ sent: 0, failed: 0 });
    expect(await send(mailer, Date.UTC(2026, 11, 1))).toEqual({ sent: 2, failed: 0 });
    expect(sent[1].subject).toBe("O que plantar em dezembro no Brasil");
    expect(await db.query("SELECT email FROM guide_subscribers ORDER BY email")).toEqual([{ email: "a@x.com" }, { email: "b@x.com" }]);
  });

  it("o descadastro desmarca sem apagar o e-mail; pedir e confirmar de novo reativa", async () => {
    const { sent, mailer } = recorder();
    await subscribeToGuide(db, mailer, { email: "a@x.com", country: "PT", locale: "pt", appUrl: "http://x" }, NOV);
    await confirmGuide(db, tokenOf(sent[0]));
    await send(mailer);
    const token = /unsubscribe\/([\w-]+)/.exec(sent[1].html)![1];
    expect((await unsubscribeAttempt(db, token, "1.2.3.4")).result).toBe("ok");
    expect(await db.query("SELECT email, unsubscribed_at IS NOT NULL AS off FROM guide_subscribers")).toEqual([{ email: "a@x.com", off: true }]);
    expect((await unsubscribeAttempt(db, token, "1.2.3.4")).result).toBe("ok"); // o link continua valendo
    expect(await send(mailer, Date.UTC(2026, 11, 1))).toEqual({ sent: 0, failed: 0 });
    expect((await send(mailer, Date.UTC(2027, 0, 1 + 40))).sent).toBe(0); // e não é apagado como pedido não confirmado

    await subscribeToGuide(db, mailer, { email: "a@x.com", country: "PT", locale: "pt", appUrl: "http://x" }, NOV);
    expect(sent).toHaveLength(3); // nova confirmação
    await confirmGuide(db, tokenOf(sent[2]));
    expect(await send(mailer, Date.UTC(2026, 11, 1))).toEqual({ sent: 1, failed: 0 });
  });

  it("o e-mail traz as plantas de cada clima no idioma de quem pediu", () => {
    const { html } = guideMonthlyEmail({ locale: "en", country: "ES", month: 11, appUrl: "http://x", unsubscribeUrl: "http://x/unsubscribe/t" });
    expect(html).toContain("Semi-arid");
    expect(html).toContain("Tomato");
    expect(html).toContain('href="http://x/what-to-plant/spain/november"');
    expect(html).not.toContain("Hello");
  });
});
