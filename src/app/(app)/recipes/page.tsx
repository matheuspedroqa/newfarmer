import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveLocale } from "@/i18n/locales";
import { RECIPE_GROUPS } from "@/lib/content-schema";
import { getRecipes } from "@/server/content";
import { requireAccess } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("nav.recipes") };
}

export default async function RecipesIndex() {
  await requireAccess();
  const t = await getTranslations("recipePage");
  const locale = resolveLocale(await getLocale());
  const recipes = getRecipes();
  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </div>
      {RECIPE_GROUPS.map((group) => (
        <div key={group}>
          <h2 className="font-display text-2xl font-bold text-accent">{t(`groups.${group}`)}</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recipes.filter((r) => r.group === group).map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                data-testid={`recipe-link-${r.id}`}
                className="flex items-center gap-4 rounded-3xl bg-surface p-4 ring-1 ring-border hover:bg-hover"
              >
                <span className="text-4xl" aria-hidden>{r.icon}</span>
                <span>
                  <span className="block font-semibold">{r.title[locale]}</span>
                  <span className="text-sm text-muted">{t("minutes", { count: r.minutes })} · {t("serves", { count: r.serves })}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
