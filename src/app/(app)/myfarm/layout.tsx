import { getTranslations } from "next-intl/server";
import { Tabs } from "@/components/Tabs";

export default async function MyFarmLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <section className="max-w-4xl space-y-6">
      <h1 className="font-display text-4xl font-bold">{t("myfarm.title")}</h1>
      <Tabs
        label={t("myfarm.tabsLabel")}
        tabs={[
          { href: "/myfarm", label: t("nav.animals") },
          { href: "/myfarm/crops", label: t("nav.crops") },
        ]}
      />
      {children}
    </section>
  );
}
