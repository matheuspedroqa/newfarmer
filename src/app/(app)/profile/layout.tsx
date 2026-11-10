import { getTranslations } from "next-intl/server";
import { Tabs } from "@/components/Tabs";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("profile");
  return (
    <section className="max-w-4xl space-y-6">
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <Tabs
        label={t("tabsLabel")}
        tabs={[
          { href: "/profile", label: t("tabData") },
          { href: "/profile/preferences", label: t("tabPreferences") },
          { href: "/profile/security", label: t("tabSecurity") },
          { href: "/profile/subscription", label: t("tabSubscription") },
        ]}
      />
      {children}
    </section>
  );
}
