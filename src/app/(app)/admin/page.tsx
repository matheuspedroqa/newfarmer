import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { formatMoney, type Currency } from "@/lib/pricing";
import { getAdminOverview } from "@/server/admin";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.admin") };
}

// Só números agregados: nenhuma conta aparece aqui.
export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("admin");
  const locale = resolveLocale(await getLocale());
  const o = await getAdminOverview(await getDb(), Date.now());
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
        <ul data-testid="views-chart" className="mt-4 flex h-40 items-end gap-1">
          {o.pageViewsByDay.map((d) => {
            const label = t("chartBar", { day: dayFormat.format(new Date(d.day)), count: d.views });
            return (
              <li key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={label}>
                <span className="sr-only">{label}</span>
                <span aria-hidden className="block rounded-t bg-primary" style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views ? 2 : 1 }} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
