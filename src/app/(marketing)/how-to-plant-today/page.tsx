import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/locales";
import { KNOWLEDGE_COUNTRIES, knowledgeCountry } from "@/lib/countries";
import { todayGuidePath } from "@/lib/plant-guide";
import { visitLocation } from "@/server/request-context";

// Um endereço só para os três idiomas: a língua vem do cookie, o destino é a página "o que plantar" do mês de agora.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plantToday");
  return { title: t("title"), description: t("intro"), alternates: { canonical: "/how-to-plant-today" } };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ country?: string | string[] }> }) {
  const locale = resolveLocale(await getLocale());
  const { country } = await searchParams;
  // Formulário GET sem JavaScript: país válido redireciona; inventado só mostra a página de novo.
  const target = typeof country === "string" ? todayGuidePath(locale, country) : null;
  if (target) redirect(target);

  const t = await getTranslations();
  const visitor = knowledgeCountry((await visitLocation()).country);
  return (
    <section className="mx-auto max-w-xl px-5 py-12 md:px-8 md:py-16">
      <h1 className="font-display text-4xl font-bold text-primary">{t("plantToday.title")}</h1>
      <p className="mt-3 text-lg text-muted">{t("plantToday.intro")}</p>
      <form method="get" className="mt-8 space-y-4 rounded-3xl bg-surface p-6 ring-1 ring-border md:p-8">
        <div>
          <label htmlFor="today-country" className="mb-1 block text-sm font-semibold">{t("plantToday.country")}</label>
          <select id="today-country" name="country" required defaultValue={visitor ?? ""} className="min-h-11 w-full rounded-xl border border-border bg-bg px-4 py-3">
            <option value="" disabled>{t("plantToday.choose")}</option>
            {KNOWLEDGE_COUNTRIES.map((c) => (
              <option key={c} value={c}>{t(`countries.${c}`)}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="w-full rounded-xl bg-primary py-3 font-bold text-primary-text shadow-lg shadow-primary/30 transition hover:opacity-90">
          {t("plantToday.button")}
        </button>
      </form>
    </section>
  );
}
