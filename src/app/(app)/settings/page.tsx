import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/authz";

export default async function SettingsPage() {
  await requirePlatformAdmin();
  redirect("/settings/activity");
}
