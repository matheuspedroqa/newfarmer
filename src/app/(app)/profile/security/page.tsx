import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/server/current-user";
import { PasswordForm } from "../PasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("profile.tabSecurity") };
}

export default async function SecurityPage() {
  await requireUser();
  const t = await getTranslations("profile");
  return (
    <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
      <h2 className="mb-4 font-display text-2xl font-bold">{t("passwordTitle")}</h2>
      <PasswordForm />
    </div>
  );
}
