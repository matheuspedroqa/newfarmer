import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { listSubscribers, SUBSCRIBER_STATUSES, type SubscriberStatus } from "@/server/admin";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";

const PAGE_SIZE = 50;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.subscribers") };
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requirePlatformAdmin(); // o layout não roda de novo na navegação pelo navegador
  const t = await getTranslations("admin");
  const params = await searchParams;
  const q = one(params.q).slice(0, 100);
  const status = (SUBSCRIBER_STATUSES as readonly string[]).includes(one(params.status)) ? (one(params.status) as SubscriberStatus) : undefined;
  const before = Number(one(params.before)) || undefined;
  const rows = await listSubscribers(await getDb(), { q, status, before, limit: PAGE_SIZE });

  const format = new Intl.DateTimeFormat(await getLocale(), { dateStyle: "short" });
  const date = (ms: number | null) => (ms === null ? t("never") : format.format(ms));
  const more = new URLSearchParams();
  if (q) more.set("q", q);
  if (status) more.set("status", status);
  if (rows.length === PAGE_SIZE) more.set("before", String(rows[rows.length - 1].createdAt));
  const cell = "px-3 py-2";
  const field = "mt-1 min-h-11 rounded-xl border border-border bg-surface px-3 py-2 font-normal";
  const link = "inline-flex min-h-11 items-center font-semibold text-primary underline";

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col text-sm font-semibold">
          {t("search")}
          <input name="q" type="search" defaultValue={q} maxLength={100} className={field} />
        </label>
        <label className="flex flex-col text-sm font-semibold">
          {t("status")}
          <select name="status" defaultValue={status ?? ""} className={field}>
            <option value="">{t("allStatuses")}</option>
            {SUBSCRIBER_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status_${s}`)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-primary px-4 py-2 font-semibold text-white">{t("filter")}</button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl bg-surface ring-1 ring-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  {["colName", "colEmail", "colCity", "colStatus", "colCreated", "colLastSeen", "colAnimals", "colCrops"].map((k) => (
                    <th key={k} className={cell}>{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-testid="subscriber-row" className="border-t border-border">
                    <td className={cell}>
                      <Link href={`/admin/subscribers/${r.id}`} className={link}>{r.name}</Link>
                      <span className="block text-xs text-muted">@{r.username}</span>
                    </td>
                    <td className={`${cell} break-all`}>{r.email}</td>
                    <td className={cell}>{r.city}</td>
                    <td className={cell}>{t(`status_${r.status}`)}</td>
                    <td className={`${cell} whitespace-nowrap`}>{date(r.createdAt)}</td>
                    <td className={`${cell} whitespace-nowrap`}>{date(r.lastSeenAt)}</td>
                    <td className={cell}>{r.animals}</td>
                    <td className={cell}>{r.crops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} data-testid="subscriber-card" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                <Link href={`/admin/subscribers/${r.id}`} className={link}>{r.name} (@{r.username})</Link>
                <p className="text-sm break-all">{r.email}</p>
                <p className="text-sm text-muted">{r.city}</p>
                <p className="mt-1 text-sm">{t(`status_${r.status}`)} · {t("colAnimals")}: {r.animals} · {t("colCrops")}: {r.crops}</p>
                <p className="text-xs text-muted">{t("colCreated")}: {date(r.createdAt)} · {t("colLastSeen")}: {date(r.lastSeenAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {more.has("before") && (
        <Link href={`/admin/subscribers?${more}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 font-semibold">
          {t("loadMore")}
        </Link>
      )}
    </div>
  );
}
