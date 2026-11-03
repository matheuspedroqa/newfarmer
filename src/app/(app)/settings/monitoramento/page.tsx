import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";
import { getPlatformStats } from "@/server/monitoring";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.monitoring") };
}

// Só números: esta tela nunca mostra e-mails, nomes nem dados das contas.
export default async function MonitoringPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("settings");
  const stats = await getPlatformStats(await getDb(), Date.now());
  const format = new Intl.DateTimeFormat(await getLocale(), { dateStyle: "short", timeStyle: "medium" });

  const cards: { id: string; label: string; value: string; detail?: string }[] = [
    { id: "users", label: t("users"), value: String(stats.users), detail: t("newUsers7d", { count: stats.newUsers7d }) },
    { id: "sessions", label: t("activeSessions"), value: String(stats.activeSessions) },
    { id: "logins", label: t("logins24h"), value: String(stats.logins24h.ok + stats.logins24h.failed), detail: t("loginsDetail", stats.logins24h) },
    { id: "locked", label: t("lockedAccounts"), value: String(stats.lockedAccounts) },
    { id: "rate-limited", label: t("rateLimited24h"), value: String(stats.rateLimited24h) },
    { id: "errors", label: t("errors24h"), value: String(stats.errors24h) },
    { id: "db", label: t("dbLatency"), value: `${stats.dbLatencyMs} ms` },
    { id: "weather", label: t("weatherCache"), value: String(stats.weatherCacheEntries) },
  ];
  const cell = "px-3 py-2";

  return (
    <div className="space-y-6">
      {/* Link para a própria página: o servidor recalcula tudo a cada visita. */}
      <Link href="/settings/monitoramento" prefetch={false} className="inline-block rounded-full border border-border px-4 py-2 font-semibold">
        {t("refresh")}
      </Link>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <section key={card.id} data-testid={`stat-${card.id}`} className="rounded-3xl bg-surface p-5 ring-1 ring-border">
            <p className="font-display text-4xl font-bold">{card.value}</p>
            <p className="text-sm text-muted">{card.label}</p>
            {card.detail && <p className="text-xs text-muted">{card.detail}</p>}
          </section>
        ))}
      </div>

      <h2 className="font-display text-2xl font-bold">{t("recentErrors")}</h2>
      {stats.recentErrors.length === 0 ? (
        <p className="text-muted">{t("noErrors")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className={cell}>{t("when")}</th>
                <th className={cell}>{t("route")}</th>
                <th className={cell}>{t("message")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentErrors.map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className={`${cell} whitespace-nowrap`}>{format.format(e.at)}</td>
                  <td className={cell}>{e.route}</td>
                  <td className={`${cell} break-all`}>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
