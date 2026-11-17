import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { CLIMATE_MAPS } from "@/lib/climate-maps";
import type { KnowledgeCountry } from "@/lib/countries";
import { COUNTRY_CLIMATES } from "@/lib/plant-guide";
import type { ClimateZone } from "@/server/climate";

// Cores fortes o bastante para os dois temas; a legenda repete o nome, então a cor nunca é a única pista.
const COLORS: Record<ClimateZone, string> = {
  tropical: "#3a9d5d",
  subtropical: "#e0b13a",
  temperate: "#4f8fd1",
  semiarid: "#d9773f",
  cold: "#9b8fe0",
};

/** Mapa do país com cada estado/província na cor do seu clima. Só o mapa do país da página vai para o HTML. */
export async function ClimateMap({ country, lang }: { country: KnowledgeCountry; lang: Locale }) {
  const map = CLIMATE_MAPS[country];
  if (!map) return null;
  const t = await getTranslations({ locale: lang });
  const zones = COUNTRY_CLIMATES[country].zones.filter((z) => map.zones[z]);
  const title = t("guide.mapTitle", { inCountry: t(`guide.inCountry.${country}`) });

  return (
    <figure className="mt-8 rounded-3xl bg-surface p-4 ring-1 ring-border md:p-6">
      <figcaption className="font-display text-2xl font-bold">{title}</figcaption>
      <div className="mt-4 grid items-center gap-6 md:grid-cols-[3fr_2fr]">
        <svg viewBox={map.viewBox} role="img" aria-label={title} className="h-auto max-h-[28rem] w-full">
          {zones.map((z) => (
            <path key={z} d={map.zones[z]} fill={COLORS[z]} stroke={COLORS[z]} strokeWidth={1.2} strokeLinejoin="round" />
          ))}
        </svg>
        <ul className="space-y-2">
          {zones.map((z) => (
            <li key={z} className="flex items-center gap-3">
              <span aria-hidden className="h-4 w-4 shrink-0 rounded" style={{ background: COLORS[z] }} />
              <a href={`#clima-${z}`} className="font-semibold hover:underline">{t("guide.zoneTitle", { zone: t(`climate.${z}`) })}</a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-sm text-muted">{t("guide.mapNote")}</p>
    </figure>
  );
}
