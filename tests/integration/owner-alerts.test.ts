import { expect, it } from "vitest";
import type { MailMessage } from "@/server/mailer";
import { alertOwner } from "@/server/owner-alerts";
import { testDb } from "../helpers/db";

it("avisa a caixa de contato uma vez por IP a cada hora, com os detalhes escapados", async () => {
  const db = await testDb();
  const sent: MailMessage[] = [];
  const mailer = { send: async (m: MailMessage) => void sent.push(m) };
  expect(await alertOwner(db, "register", { País: "PT", "Veio de": "<b>x</b>" }, "1.2.3.4", mailer, 1000)).toBe(true);
  expect(await alertOwner(db, "register", { País: "PT" }, "1.2.3.4", mailer, 2000)).toBe(false); // mesmo IP, mesma hora
  expect(await alertOwner(db, "register", { País: "BR" }, "5.6.7.8", mailer, 3000)).toBe(true);
  expect(await alertOwner(db, "trial", { Usuário: "maria" }, "1.2.3.4", mailer, 4000)).toBe(true); // outro tipo de aviso
  expect(sent).toHaveLength(3);
  expect(sent[0].to).toBe("contact@newfarmer.app");
  expect(sent[0].subject).toBe("NewFarmer: Alguém abriu a página de cadastro");
  expect(sent[0].html).toContain("&lt;b&gt;x&lt;/b&gt;");
});

it("falha no envio não derruba quem chamou", async () => {
  const db = await testDb();
  const mailer = { send: async () => { throw new Error("Resend fora do ar"); } };
  expect(await alertOwner(db, "trial", { Usuário: "joao" }, "9.9.9.9", mailer)).toBe(false);
});
