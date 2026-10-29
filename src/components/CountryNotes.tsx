import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { knowledgeCountry } from "@/lib/countries";
import type { AnimalContent } from "@/lib/content-schema";

type Notes = AnimalContent["countryNotes"];

/** Bloco "No seu país": aparece só quando o país do cadastro está na base de conhecimento. */
export async function CountryNotes({ notes, countryCode }: { notes: Notes; countryCode: string }) {
  const country = knowledgeCountry(countryCode);
  const note = country ? notes?.[country] : undefined;
  if (!country || !note) return null;

  const t = await getTranslations();
  const locale = resolveLocale(await getLocale());
  return (
    <section data-testid="country-notes" className="rounded-3xl bg-rail p-6 text-white">
      <h2 className="font-display text-2xl font-bold">📍 {t("content.inYourCountry", { country: t(`countries.${country}`) })}</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {note.highlights.map((h, i) => (
          <li key={i}>{h[locale]}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs opacity-80">
        {t("content.sources")}:{" "}
        {note.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a>
          </span>
        ))}
      </p>
    </section>
  );
}
