import { getLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locales";
import { renderMarkdown } from "@/lib/markdown";
import { getLegalText } from "@/server/legal";

export async function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const text = getLegalText(doc, resolveLocale(await getLocale()));
  return (
    <article
      className="mx-auto max-w-3xl space-y-4 px-5 py-12 [overflow-wrap:anywhere] md:px-8 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-primary [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
    >
      {renderMarkdown(text)}
    </article>
  );
}
