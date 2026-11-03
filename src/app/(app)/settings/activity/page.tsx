import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { normalizeUsername } from "@/lib/username";
import { ACTIVITY_ACTIONS, listActivityWithUsernames, type ActivityAction } from "@/server/activity-log";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";

const PAGE_SIZE = 50;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.activityLogs") };
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Params> }) {
  // O layout já confere, mas a página também: nunca depender só do layout para autorizar.
  await requirePlatformAdmin();
  const t = await getTranslations();
  const params = await searchParams;
  const username = normalizeUsername(one(params.username));
  const action = (ACTIVITY_ACTIONS as readonly string[]).includes(one(params.action)) ? (one(params.action) as ActivityAction) : undefined;
  const before = Number(one(params.before)) || undefined;

  const db = await getDb();
  const [account] = username ? await db.query<{ id: number }>("SELECT id FROM users WHERE username = $1", [username]) : [];
  // Conta da pessoa OU tentativas contra esse username (mesmo sem conta, como login errado).
  const rows = await listActivityWithUsernames(db, { userId: account?.id, target: username || undefined, action, before, limit: PAGE_SIZE });

  const format = new Intl.DateTimeFormat(await getLocale(), { dateStyle: "short", timeStyle: "medium" });
  const more = new URLSearchParams();
  if (username) more.set("username", username);
  if (action) more.set("action", action);
  if (rows.length === PAGE_SIZE) more.set("before", String(rows[rows.length - 1].createdAt));
  const cell = "px-3 py-2";

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm font-semibold">
          {t("settings.username")}
          <input name="username" defaultValue={username} className="mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-normal" />
        </label>
        <label className="flex flex-col text-sm font-semibold">
          {t("settings.action")}
          <select name="action" defaultValue={action ?? ""} className="mt-1 rounded-xl border border-border bg-surface px-3 py-2 font-normal">
            <option value="">{t("settings.allActions")}</option>
            {ACTIVITY_ACTIONS.map((a) => (
              <option key={a} value={a}>{t(`activity.${a}`)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-primary px-4 py-2 font-semibold text-white">{t("settings.filter")}</button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted">{t("settings.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className={cell}>{t("settings.when")}</th>
                <th className={cell}>{t("settings.who")}</th>
                <th className={cell}>{t("settings.what")}</th>
                <th className={cell}>{t("settings.target")}</th>
                <th className={cell}>{t("settings.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-testid="activity-row" className="border-t border-border">
                  <td className={`${cell} whitespace-nowrap`}>{format.format(row.createdAt)}</td>
                  <td className={cell}>{row.username ?? "—"}</td>
                  <td className={cell}>{t(`activity.${row.action}`)}</td>
                  <td className={`${cell} break-all`}>{row.target}</td>
                  <td className={cell}>{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {more.has("before") && (
        <Link href={`/settings/activity?${more}`} className="inline-block rounded-full border border-border px-4 py-2 font-semibold">
          {t("settings.loadMore")}
        </Link>
      )}
    </div>
  );
}
