import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CROPS, CROP_GROUPS } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("nav.crops") };
}

export default async function CropsIndex() {
  const t = await getTranslations();
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">{t("cropPage.groups")}</h1>
        <Link
          href="/myfarm#plantacoes"
          className="flex items-center gap-2 rounded-3xl border-2 border-dashed border-primary/30 px-5 py-3 text-primary transition-colors duration-150 hover:bg-hover motion-reduce:transition-none"
        >
          {t("cropPage.addCrop")}
        </Link>
      </div>
      {CROP_GROUPS.map((group) => (
        <div key={group}>
          <h2 className="font-display text-2xl font-bold text-accent">{t(`cropGroups.${group}`)}</h2>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {CROPS.filter((c) => c.group === group).map((c) => (
              <Link
                key={c.id}
                href={`/plantacoes/${c.id}`}
                data-testid={`crop-link-${c.id}`}
                className="flex flex-col items-center rounded-3xl bg-surface p-5 ring-1 ring-border hover:bg-hover"
              >
                <span className="text-4xl" aria-hidden>{c.icon}</span>
                <span className="mt-2 font-semibold">{t(`crops.${c.id}`)}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
