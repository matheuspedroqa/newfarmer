import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/server/authz";
import { SettingsTabs } from "./SettingsTabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  const t = await getTranslations("settings");
  return (
    <section className="max-w-6xl space-y-6">
      <h1 className="font-display text-4xl font-bold">Settings</h1>
      <SettingsTabs
        label={t("tabsLabel")}
        tabs={[
          { href: "/admin/activity", label: t("tabActivity") },
          { href: "/admin/monitoring", label: t("tabMonitoring") },
        ]}
      />
      {children}
    </section>
  );
}
