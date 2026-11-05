import { describe, expect, it } from "vitest";
import { sendContactMessage } from "@/server/contact";
import type { MailMessage } from "@/server/mailer";

describe("sendContactMessage", () => {
  it("manda para a caixa de contato, responde para quem escreveu e escapa o HTML", async () => {
    const sent: MailMessage[] = [];
    await sendContactMessage({ async send(m) { sent.push(m); } }, { name: "Ana\r\nBcc: x@y", email: "ana@x.com", message: "<script>oi</script>\nlinha 2", locale: "pt" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "contact@newfarmer.app", replyTo: "ana@x.com", subject: "Contato pelo site: Ana Bcc: x@y" });
    expect(sent[0].html).toContain("&lt;script&gt;oi&lt;/script&gt;<br>linha 2");
    expect(sent[0].html).not.toContain("<script>");
  });
});
