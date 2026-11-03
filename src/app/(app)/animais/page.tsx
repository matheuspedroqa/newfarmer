import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("nav.animals") };
}

export default async function AnimalsIndex() {
  const user = await requireUser();
  const { animals } = await getFarm(await getDb(), user.id);
  if (animals.length) redirect(`/animais/${animals[0].id}`);
  const t = await getTranslations();
  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl font-bold">{t("animalPage.emptyTitle")}</h1>
      <p className="text-muted">{t("animalPage.emptyText")}</p>
      <Link
        href="/myfarm#animais"
        className="inline-block rounded-full bg-primary px-5 py-2 font-semibold text-primary-text transition-colors duration-150 hover:opacity-90 motion-reduce:transition-none"
      >
        {t("animalPage.addAnimal")}
      </Link>
    </section>
  );
}
