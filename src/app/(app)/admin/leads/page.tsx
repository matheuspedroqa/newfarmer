import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";
import { FUNNEL_STEPS, leadFunnel, listLeads } from "@/server/page-views";

const PAGE_SIZE = 50;
const PERIODS = [7, 30, 90] as const;
const DIA = 86_400_000;
const STEP_KEY = { "/": "home", "/register": "register", "/welcome": "welcome", "/subscribe": "subscribe", paid: "paid" } as const;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.leads") };
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requirePlatformAdmin();
  const t = await getTranslations("admin");
  const params = await searchParams;
  const days = PERIODS.find((d) => String(d) === one(params.days)) ?? 30;
  const n = Number(one(params.before));
  const before = Number.isSafeInteger(n) && n > 0 ? n : undefined;
  const db = await getDb();
  const since = Date.now() - days * DIA;
  const [funnel, fetched] = await Promise.all([leadFunnel(db, since), listLeads(db, { since, before, limit: PAGE_SIZE + 1 })]);
  const rows = fetched.slice(0, PAGE_SIZE);

  const format = new Intl.DateTimeFormat(await getLocale(), { dateStyle: "short", timeStyle: "short" });
  const max = Math.max(1, ...FUNNEL_STEPS.map((s) => funnel[s]));
  const stepName = (s: (typeof FUNNEL_STEPS)[number] | null) => (s ? t(`step_${STEP_KEY[s]}`) : "—");
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const link = `inline-flex min-h-11 items-center font-semibold text-primary underline ${focus}`;
  const cell = "px-3 py-2";
  const account = (u: (typeof rows)[number]["user"]) =>
    u ? <Link href={`/admin/subscribers/${u.id}`} className={link}>@{u.username}</Link> : <span className="text-muted">{t("noAccount")}</span>;

  return (
    <div className="space-y-6">
      <nav aria-label={t("leadsPeriod")} className="flex flex-wrap gap-2">
        {PERIODS.map((d) => (
          <Link
            key={d}
            href={`/admin/leads?days=${d}`}
            aria-current={d === days ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 font-semibold ring-1 ring-border ${focus} ${d === days ? "bg-primary text-white" : "bg-surface"}`}
          >
            {t(`days${d}`)}
          </Link>
        ))}
      </nav>

      <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
        <h2 className="font-display text-xl font-bold">{t("funnelTitle")}</h2>
        <ol data-testid="funnel" className="mt-4 space-y-3">
          {FUNNEL_STEPS.map((s, i) => {
            const prev = i ? funnel[FUNNEL_STEPS[i - 1]] : 0;
            return (
              <li key={s} data-testid={`funnel-${STEP_KEY[s]}`}>
                <p className="flex flex-wrap justify-between gap-x-3 text-sm">
                  <span className="font-semibold">{stepName(s)}: {funnel[s]}</span>
                  {i > 0 && <span className="text-muted">{prev ? t("funnelPct", { pct: Math.round((funnel[s] / prev) * 100) }) : "—"}</span>}
                </p>
                <span aria-hidden className="mt-1 block h-3 rounded-full bg-primary" style={{ width: `${(funnel[s] / max) * 100}%`, minWidth: 4 }} />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">{t("recentVisitors")}</h2>
        {rows.length === 0 ? (
          <p className="text-muted">{t("leadsEmpty")}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl bg-surface ring-1 ring-border md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>{["colFirstSeen", "colLastVisit", "colPages", "colLastPage", "colReached", "colAccount"].map((k) => <th key={k} className={cell}>{t(k)}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.visitorId} data-testid="lead-row" className="border-t border-border">
                      <td className={`${cell} whitespace-nowrap`}>{format.format(r.firstSeen)}</td>
                      <td className={`${cell} whitespace-nowrap`}>{format.format(r.lastSeen)}</td>
                      <td className={cell}>{r.pages}</td>
                      <td className={`${cell} break-all`}>{r.lastPath}</td>
                      <td className={cell}>{stepName(r.furthestStep)}</td>
                      <td className={cell}>{account(r.user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 md:hidden">
              {rows.map((r) => (
                <li key={r.visitorId} data-testid="lead-card" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                  <p className="font-semibold">{stepName(r.furthestStep)} · {r.pages} {t("colPages").toLowerCase()}</p>
                  <p className="text-sm break-all">{t("colLastPage")}: {r.lastPath}</p>
                  <p className="text-xs text-muted">{format.format(r.firstSeen)} → {format.format(r.lastSeen)}</p>
                  {account(r.user)}
                </li>
              ))}
            </ul>
          </>
        )}
        {fetched.length > PAGE_SIZE && (
          <Link href={`/admin/leads?days=${days}&before=${rows[rows.length - 1].lastSeen}`} className={`inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 font-semibold ${focus}`}>
            {t("loadMore")}
          </Link>
        )}
      </section>
    </div>
  );
}
