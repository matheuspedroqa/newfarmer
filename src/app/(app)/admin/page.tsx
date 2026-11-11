import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveLocale } from "@/i18n/locales";
import { formatMoney, type Currency } from "@/lib/pricing";
import { WORLD_PATHS, WORLD_VIEWBOX } from "@/lib/world-map";
import { getAdminOverview } from "@/server/admin";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";
import { visitsByCountry } from "@/server/page-views";

const DIA = 24 * 60 * 60_000;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.admin") };
}

// Só números agregados: nenhuma conta aparece aqui.
export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  await requirePlatformAdmin();
  const t = await getTranslations("admin");
  const locale = resolveLocale(await getLocale());
  const db = await getDb();
  const o = await getAdminOverview(db, Date.now());
  // Dia escolhido no gráfico (só um dos 14 mostrados); sem dia, o mapa soma os 14.
  const { day: askedDay } = await searchParams;
  const day = o.pageViewsByDay.find((d) => d.day === askedDay)?.day ?? null;
  const from = Date.parse(day ?? o.pageViewsByDay[0].day);
  const to = day ? from + DIA : Date.parse(o.pageViewsByDay[o.pageViewsByDay.length - 1].day) + DIA;
  const countries = await visitsByCountry(db, from, to);
  const currencies = (["brl", "eur", "usd"] as Currency[]).filter((c) => o.mrr[c] > 0);
  const mrr = (currencies.length ? currencies : (["brl"] as Currency[])).map((c) => formatMoney(c, o.mrr[c], locale)).join(" · ");
  const cards = [
    { id: "active", label: t("activeSubscribers"), value: String(o.subscriptions.active) },
    { id: "mrr", label: t("mrr"), value: mrr },
    { id: "new", label: t("new30"), value: String(o.newSubscriptions30d) },
    { id: "canceled", label: t("canceled30"), value: String(o.cancellations30d) },
    { id: "visitors", label: t("visitors7d"), value: String(o.visitors7d) },
    { id: "views", label: t("pageViews7d"), value: String(o.pageViews7d) },
  ];
  const max = Math.max(1, ...o.pageViewsByDay.map((d) => d.views));
  const dayFormat = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <section key={c.id} data-testid={`overview-${c.id}`} className="rounded-3xl bg-surface p-5 ring-1 ring-border">
            <p className="font-display text-3xl font-bold break-words">{c.value}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </section>
        ))}
      </div>
      <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
        <h2 className="font-display text-xl font-bold">{t("chartTitle")}</h2>
        <p className="text-sm text-muted">{t("chartHint")}</p>
        <ul data-testid="views-chart" className="mt-4 flex h-40 items-end gap-1">
          {o.pageViewsByDay.map((d) => {
            const label = t("chartBar", { day: dayFormat.format(new Date(d.day)), count: d.views });
            const selected = d.day === day;
            return (
              <li key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <Link
                  href={selected ? "/admin" : `/admin?day=${d.day}`}
                  title={label}
                  aria-current={selected ? "date" : undefined}
                  className="flex h-full flex-col justify-end rounded-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="sr-only">{label}</span>
                  <span
                    aria-hidden
                    className={`block rounded-t ${day && !selected ? "bg-border" : "bg-primary"}`}
                    style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views ? 2 : 1 }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <CountryMap
        countries={countries}
        locale={locale}
        title={t("mapTitle", { period: day ? dayFormat.format(new Date(day)) : t("mapAll") })}
        labels={{
          country: t("country"),
          visitors: t("visitors"),
          views: t("views"),
          unknown: t("unknownCountry"),
          empty: t("mapEmpty"),
          few: t("mapFew"),
          many: t("mapMany"),
          showAll: day ? t("mapShowAll") : null,
        }}
        tooltips={Object.fromEntries(countries.map((c) => [c.country, t("mapCountry", { country: regionName(locale, c.country, t("unknownCountry")), visitors: c.visitors, views: c.views })]))}
      />
    </div>
  );
}

const regionName = (locale: string, code: string, unknown: string) =>
  code ? (new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code) : unknown;

// 5 faixas do mesmo verde misturado com o fundo: funciona no modo claro e no escuro.
const STEPS = [22, 40, 58, 78, 100];
const shade = (p: number) => `color-mix(in oklab, var(--primary) ${p}%, var(--surface))`;

/** Mapa-múndi pintado pela quantidade de páginas vistas (um tom, do claro ao escuro) e a tabela com os números. */
function CountryMap({
  countries,
  locale,
  title,
  labels,
  tooltips,
}: {
  countries: { country: string; visitors: number; views: number }[];
  locale: string;
  title: string;
  labels: { country: string; visitors: string; views: string; unknown: string; empty: string; few: string; many: string; showAll: string | null };
  tooltips: Record<string, string>;
}) {
  const byCode = new Map(countries.map((c) => [c.country, c]));
  const max = Math.max(1, ...countries.filter((c) => c.country).map((c) => c.views));
  const fill = (views: number) => shade(STEPS[Math.min(4, Math.ceil((views / max) * 5) - 1)]);
  return (
    <section data-testid="country-map" className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {labels.showAll && (
          <Link href="/admin" className="text-sm font-semibold text-primary underline">
            {labels.showAll}
          </Link>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <svg viewBox={WORLD_VIEWBOX} role="img" aria-label={title} className="h-auto w-full">
            {Object.entries(WORLD_PATHS).map(([code, d]) => {
              const c = byCode.get(code);
              return (
                <path key={code} d={d} fill={c ? fill(c.views) : "var(--soft)"} stroke="var(--surface)" strokeWidth={0.6} data-country={c ? code : undefined}>
                  {c && <title>{tooltips[code]}</title>}
                </path>
              );
            })}
          </svg>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted" aria-hidden>
            <span>{labels.few}</span>
            {STEPS.map((p) => (
              <span key={p} className="h-3 w-6 rounded-sm" style={{ background: shade(p) }} />
            ))}
            <span>{labels.many}</span>
          </div>
        </div>
        {countries.length ? (
          <table data-testid="country-table" className="w-full self-start text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-semibold">{labels.country}</th>
                <th className="py-1 text-right font-semibold">{labels.visitors}</th>
                <th className="py-1 text-right font-semibold">{labels.views}</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.country} className="border-t border-border">
                  <td className="py-1.5">{regionName(locale, c.country, labels.unknown)}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.visitors}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">{labels.empty}</p>
        )}
      </div>
    </section>
  );
}
