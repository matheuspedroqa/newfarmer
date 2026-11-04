import { describe, expect, it } from "vitest";
import { renderMarketingEmail } from "@/server/marketing-templates";

const base = { name: "<b>Ana</b>", unsubscribeUrl: "https://nf.app/unsubscribe/tok", appUrl: "https://nf.app" };

describe("e-mails de marketing", () => {
  it("weMissYou em pt e en: assunto, link de descadastro, nome escapado, botão", () => {
    const pt = renderMarketingEmail({ ...base, template: "weMissYou", locale: "pt" });
    const en = renderMarketingEmail({ ...base, template: "weMissYou", locale: "en" });
    expect(pt.subject).toBe("Sentimos sua falta no NewFarmer 🌱");
    expect(en.subject).toBe("We miss you at NewFarmer 🌱");
    for (const { html } of [pt, en]) {
      expect(html).toContain('href="https://nf.app/unsubscribe/tok"');
      expect(html).toContain('href="https://nf.app/subscribe"');
      expect(html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
      expect(html).not.toContain("<b>Ana</b>");
    }
    expect(pt.html).toContain("Descadastrar");
    expect(en.html).toContain("Unsubscribe");
  });

  it("announcement escapa o texto do Admin e converte quebras de linha", () => {
    const { subject, html } = renderMarketingEmail({
      ...base, template: "announcement", locale: "pt", subject: "Novo <i>", body: "<script>x</script>\nlinha 2",
    });
    expect(subject).toBe("Novo <i>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;<br>linha 2");
    expect(html).toContain('href="https://nf.app/dashboard"');
    expect(html).toContain("Abrir o NewFarmer");
  });
});
