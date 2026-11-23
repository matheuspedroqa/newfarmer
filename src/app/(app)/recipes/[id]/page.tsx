import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourcesList } from "@/components/SourcesList";
import { resolveLocale } from "@/i18n/locales";
import { getRecipes } from "@/server/content";
import { requireAccess } from "@/server/current-user";

const find = (id: string) => getRecipes().find((r) => r.id === id);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const recipe = find((await params).id);
  return recipe ? { title: recipe.title[resolveLocale(await getLocale())] } : {};
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const recipe = find((await params).id);
  if (!recipe) notFound();
  await requireAccess();
  const t = await getTranslations("recipePage");
  const locale = resolveLocale(await getLocale());

  return (
    <article className="space-y-6">
      <Link href="/recipes" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline md:min-h-0">← {t("back")}</Link>
      <header>
        <h1 className="font-display text-4xl font-bold"><span aria-hidden>{recipe.icon}</span> {recipe.title[locale]}</h1>
        <p className="mt-2 max-w-3xl text-lg">{recipe.summary[locale]}</p>
        <p className="mt-2 text-sm font-semibold text-muted">{t("minutes", { count: recipe.minutes })} · {t("serves", { count: recipe.serves })}</p>
      </header>

      {recipe.safety && (
        <p data-testid="recipe-safety" className="max-w-3xl rounded-2xl border-2 border-accent/40 bg-soft p-4">
          <strong>⚠️ {t("safety")}:</strong> {recipe.safety[locale]}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">{t("ingredients")}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {recipe.ingredients.map((x, i) => <li key={i}>{x[locale]}</li>)}
          </ul>
        </section>
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">{t("steps")}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {recipe.steps.map((x, i) => <li key={i}>{x[locale]}</li>)}
          </ol>
        </section>
      </div>

      {recipe.tip && (
        <p className="max-w-3xl rounded-2xl bg-soft p-4"><strong>💡 {t("tip")}:</strong> {recipe.tip[locale]}</p>
      )}

      <div>
        <p className="mb-2 text-sm text-muted">{t("sourcesNote")}</p>
        <SourcesList sources={recipe.sources} />
      </div>
    </article>
  );
}
