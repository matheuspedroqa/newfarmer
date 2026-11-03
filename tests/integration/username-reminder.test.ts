import { describe, expect, it } from "vitest";
import { listActivity } from "@/server/activity-log";
import type { MailMessage, Mailer } from "@/server/mailer";
import { sendUsernameReminder } from "@/server/username-reminder";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

function captureMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (m) => void sent.push(m) };
  return { sent, mailer };
}

describe("sendUsernameReminder", () => {
  it("esqueci o username: manda o username para o e-mail; e-mail sem conta não manda nada", async () => {
    const db = await testDb();
    const id = await makeUser(db, { username: "ana", email: "ana@exemplo.com" });
    const { sent, mailer } = captureMailer();
    await sendUsernameReminder(db, mailer, { email: "ANA@exemplo.com", baseUrl: "http://x", locale: "pt", ip: "9.9.9.9" });
    await sendUsernameReminder(db, mailer, { email: "ninguem@exemplo.com", baseUrl: "http://x", locale: "pt" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@exemplo.com");
    expect(sent[0].subject).toBe("Seu username no NewFarmer");
    expect(sent[0].html).toContain(">ana<");
    expect(sent[0].html).toContain('href="http://x/login"');
    const log = await listActivity(db, { action: "auth.usernameReminder" });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ userId: id, target: "ana", ip: "9.9.9.9" });
  });
});
