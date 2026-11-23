import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { resolveLocale } from "@/i18n/locales";
import { getRecipes } from "@/server/content";

// "Receitas com <item>": só os nomes, cada um levando à receita. Some se nenhuma receita usa o item.
export async function RecipeLinks({ item, name }: { item: string; name: string }) {
  const recipes = getRecipes().filter((r) => (r.uses as string[]).includes(item));
  if (!recipes.length) return null;
  const t = await getTranslations("recipePage");
  const locale = resolveLocale(await getLocale());
  return (
    <section data-testid="recipe-links" className="rounded-2xl bg-soft p-5">
      <h2 className="font-display text-xl font-bold">{t("with", { name: name.toLocaleLowerCase(locale) })}</h2>
      <ul className="mt-2 space-y-1">
        {recipes.map((r) => (
          <li key={r.id}>
            <Link href={`/recipes/${r.id}`} className="inline-flex min-h-11 items-center text-primary hover:underline md:min-h-0">
              <span aria-hidden className="mr-2">{r.icon}</span>
              {r.title[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
