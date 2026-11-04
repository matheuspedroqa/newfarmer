import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { listDevEmails } from "@/server/mailer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.devInbox"), robots: { index: false, follow: false } };
}

export default async function DevInboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const t = await getTranslations("devInbox");
  const emails = await listDevEmails((await getDb()));

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted">{t("help")}</p>
      {emails.length === 0 && <p>{t("empty")}</p>}
      {emails.map((email) => (
        <article key={email.id} className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            {t("to")}: {email.to} · {new Date(email.createdAt).toLocaleString()}
          </p>
          <h2 className="font-semibold">{email.subject}</h2>
          {/* Corpo gerado pelo próprio sistema, com o nome do usuário já escapado em password-reset.ts */}
          <div data-testid="dev-email-link" className="mt-2 break-all [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: email.html }} />
        </article>
      ))}
    </div>
  );
}
