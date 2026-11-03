import { describe, expect, it } from "vitest";
import { resetEmail, verifyEmail } from "@/server/email-templates";

const link = "https://newfarmer.app/confirmar/abc123";

describe("modelos de e-mail", () => {
  it("confirmação de conta: assunto, saudação, botão e link escrito por extenso", () => {
    const { subject, html } = verifyEmail("pt", "Ana", link);
    expect(subject).toBe("Confirme seu e-mail no NewFarmer");
    expect(html).toContain("Olá, Ana!");
    expect(html).toContain(`href="${link}"`);
    expect(html.split(link).length - 1).toBe(3); // botão + endereço visível + href do endereço
    expect(html).toContain("Confirmar meu e-mail");
    expect(html).toContain('lang="pt"');
  });

  it("recuperação de senha em inglês", () => {
    const { subject, html } = resetEmail("en", "Bob", link);
    expect(subject).toBe("Recover your NewFarmer password");
    expect(html).toContain("Hello, Bob!");
    expect(html).toContain("Create a new password");
    expect(html).toContain("1 hour");
  });

  it("nome com código não vira código no e-mail", () => {
    const { html } = verifyEmail("pt", '<img src=x onerror="alert(1)">', link);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
