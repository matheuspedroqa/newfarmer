import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/server/authz";
import { getDb } from "@/server/db";
import { AUDIENCES, audienceCount, listCampaigns, type Audience } from "@/server/marketing";
import { CampaignForm } from "./CampaignForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.emails") };
}

export default async function EmailsPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("admin");
  const db = await getDb();
  const counts = Object.fromEntries(await Promise.all(AUDIENCES.map(async (a) => [a, await audienceCount(db, a)]))) as Record<Audience, number>;
  const campaigns = await listCampaigns(db);
  const format = new Intl.DateTimeFormat(await getLocale(), { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <CampaignForm counts={counts} />
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">{t("historyTitle")}</h2>
        {campaigns.length === 0 ? (
          <p className="text-muted">{t("historyEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id} data-testid="campaign-row" className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                <p className="font-semibold break-words">{c.subject || t(`template_${c.template}`)}</p>
                <p className="text-sm">{t(`template_${c.template}`)} · {t(`audience_${c.audience}`)}</p>
                <p className="text-sm text-muted">{t("colSent")}: <span data-testid="campaign-sent">{c.sent}</span> · {format.format(c.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
