import { getTranslations } from "next-intl/server";

export async function SourcesList({ sources }: { sources: { title: string; url: string }[] }) {
  const t = await getTranslations("content");
  return (
    <footer data-testid="sources" className="border-t border-border pt-4 text-sm text-muted">
      <p className="font-semibold">{t("sources")}</p>
      <ul className="mt-1 list-disc pl-5">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{s.title}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
