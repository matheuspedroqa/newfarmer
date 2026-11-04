import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/server/authz";
import { AdminTabs } from "./AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  const t = await getTranslations();
  return (
    <section className="max-w-6xl space-y-6">
      <h1 className="font-display text-4xl font-bold">{t("admin.title")}</h1>
      <AdminTabs
        label={t("admin.tabsLabel")}
        tabs={[
          { href: "/admin", label: t("admin.tabOverview") },
          { href: "/admin/subscribers", label: t("admin.tabSubscribers") },
          { href: "/admin/leads", label: t("admin.tabLeads") },
          { href: "/admin/emails", label: t("admin.tabEmails") },
          { href: "/admin/activity", label: t("settings.tabActivity") },
          { href: "/admin/monitoring", label: t("settings.tabMonitoring") },
        ]}
      />
      {children}
    </section>
  );
}
