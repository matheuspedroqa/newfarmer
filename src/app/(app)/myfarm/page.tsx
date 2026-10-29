import { getTranslations } from "next-intl/server";
import { saveFarmAction } from "@/app/actions/farm";
import { CityForm } from "@/components/CityForm";
import { FarmForm } from "@/components/FarmForm";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

export default async function MyFarmPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  return (
    <section className="max-w-4xl space-y-10">
      <h1 className="font-display text-4xl font-bold">{t("myfarm.title")}</h1>
      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("myfarm.cityTitle")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("myfarm.currentCity")}: <b data-testid="current-city">{user.cityLabel}</b>
        </p>
        <CityForm />
      </div>
      <FarmForm initial={getFarm(getDb(), user.id)} action={saveFarmAction} submitLabel={t("farm.save")} />
    </section>
  );
}
