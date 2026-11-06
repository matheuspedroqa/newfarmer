import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setSubscriptionPausedAction } from "@/app/actions/admin";
import { resolveLocale } from "@/i18n/locales";
import { CROPS } from "@/lib/catalog";
import { formatMoney, type Currency } from "@/lib/pricing";
import { logSafely } from "@/server/activity-log";
import { animalIcon, getSubscriberDetail } from "@/server/admin";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";
import { clientIp } from "@/server/request-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.subscriber") };
}

export default async function SubscriberDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const db = await getDb();
  const d = await getSubscriberDetail(db, Number(id));
  if (!d) notFound();
  await logSafely(db, { userId: admin.id, action: "admin.viewedUser", target: d.username, ip: await clientIp() });

  const t = await getTranslations("admin");
  const tc = await getTranslations();
  const locale = resolveLocale(await getLocale());
  const date = (ms: number | null) => (ms === null ? t("never") : new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(ms));
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" });
  const sub = d.subscription;
  const status = !sub ? "none" : sub.status === "trialing" ? "active" : ["active", "past_due", "paused", "canceled"].includes(sub.status) ? sub.status : "none";
  const block = "rounded-3xl bg-surface p-5 ring-1 ring-border";
  const pill = "rounded-full bg-background px-3 py-1 text-sm ring-1 ring-border";
  const rows = (items: [string, React.ReactNode][]) => (
    <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
  const subRows: [string, React.ReactNode][] = sub
    ? [
        [t("status"), t(`status_${status}`)],
        ...(sub.amount !== null && sub.currency ? [[t("amount"), formatMoney(sub.currency as Currency, sub.amount, locale)] as [string, string]] : []),
        [t("periodEnd"), date(sub.currentPeriodEnd)],
        [t("cancelsAtEnd"), sub.cancelAtPeriodEnd ? t("yes") : t("no")],
        [t("startedAt"), date(sub.startedAt)],
        [t("canceledAt"), date(sub.canceledAt)],
      ]
    : [];

  return (
    <div className="space-y-4">
      <Link href="/admin/subscribers" className="inline-flex min-h-11 items-center font-semibold text-primary underline">← {t("back")}</Link>
      <h2 className="font-display text-3xl font-bold break-words">{d.name}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={block} aria-labelledby="blk-account" data-testid="detail-account">
          <h3 id="blk-account" className="font-display text-xl font-bold">{t("account")}</h3>
          {rows([
            [t("username"), `@${d.username}`],
            [t("colEmail"), d.email],
            [t("verified"), d.emailVerified ? t("yes") : t("no")],
            [t("city"), d.city],
            [t("country"), d.country],
            [t("colCreated"), date(d.createdAt)],
            [t("colLastSeen"), date(d.lastSeenAt)],
            [t("marketing"), <span key="m" data-testid="detail-marketing">{d.marketingOptIn ? t("marketingYes") : t("marketingNo")}</span>],
          ])}
        </section>
        <section className={block} aria-labelledby="blk-sub">
          <h3 id="blk-sub" className="font-display text-xl font-bold">{t("subscription")}</h3>
          {sub ? rows(subRows) : <p className="mt-3 text-sm text-muted">{t("noSubscription")}</p>}
          {(error === "pause" || error === "rateLimited") && (
            <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{t(error === "pause" ? "pauseFailed" : "pauseLimited")}</p>
          )}
          {(sub?.status === "active" || sub?.status === "paused") && (
            <form action={setSubscriptionPausedAction} className="mt-4">
              <input type="hidden" name="userId" value={d.id} />
              <input type="hidden" name="pause" value={sub.status === "active" ? "1" : "0"} />
              <button type="submit" className="inline-flex min-h-11 items-center rounded-full border-2 border-primary px-5 py-2 font-semibold transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t(sub.status === "active" ? "pauseSubscription" : "resumeSubscription")}
              </button>
              <p className="mt-2 text-xs text-muted">{t(sub.status === "active" ? "pauseHelp" : "resumeHelp")}</p>
            </form>
          )}
        </section>
        <section className={block} aria-labelledby="blk-farm" data-testid="detail-farm">
          <h3 id="blk-farm" className="font-display text-xl font-bold">{t("creation")}</h3>
          {d.animals.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noAnimals")}</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.animals.map((a) => (
                <li key={a.id} className={pill}>
                  <span aria-hidden>{animalIcon(a.id)}</span> {tc(`animals.${a.id}`)} × {a.count}
                </li>
              ))}
            </ul>
          )}
          {d.crops.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noCrops")}</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.crops.map((c) => (
                <li key={c} className={pill}>
                  <span aria-hidden>{CROPS.find((x) => x.id === c)?.icon}</span> {tc(`crops.${c}`)}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={block} aria-labelledby="blk-pages">
          <h3 id="blk-pages" className="font-display text-xl font-bold">{t("pagesVisited")}</h3>
          {d.pageViews.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noPages")}</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
              {d.pageViews.map((p, i) => (
                <li key={i} className="flex flex-wrap gap-x-3">
                  <span className="text-muted">{dateTime.format(p.createdAt)}</span>
                  <span className="break-all">{p.path}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
