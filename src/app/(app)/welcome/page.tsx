import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { saveFarmAndContinueAction } from "@/app/actions/farm";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { FarmForm } from "@/components/FarmForm";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.welcome") };
}

export default async function WelcomeFarmPage() {
  const user = await requireUser();
  const t = await getTranslations("farm");
  return (
    <section className="max-w-4xl">
      <OnboardingSteps current={2} />
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("help")}</p>
      <div className="mt-8">
        <FarmForm
          initial={await getFarm((await getDb()), user.id)}
          action={saveFarmAndContinueAction}
          submitLabel={t("continue")}
          footer={<Link href="/subscribe" className="text-accent hover:underline">{t("skip")}</Link>}
        />
      </div>
    </section>
  );
}
