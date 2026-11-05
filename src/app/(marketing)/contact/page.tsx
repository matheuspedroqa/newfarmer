import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/ContactForm";
import { marketingAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("title"), description: t("intro"), alternates: marketingAlternates("/contact", "en") };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  return (
    <section className="mx-auto max-w-xl px-5 py-12 md:px-8 md:py-16">
      <h1 className="font-display text-4xl font-bold text-primary">{t("title")}</h1>
      <p className="mt-3 text-lg text-muted">{t("intro")}</p>
      <div className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-border md:p-8">
        <ContactForm />
      </div>
    </section>
  );
}
