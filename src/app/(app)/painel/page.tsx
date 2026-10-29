import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/current-user";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations("dashboard");
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold">{t("hello", { name: user.name })}</h1>
      <p className="text-muted">{t("comingSoon")}</p>
    </section>
  );
}
