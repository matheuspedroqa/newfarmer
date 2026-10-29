import { getTranslations } from "next-intl/server";

export async function VetWarning() {
  const t = await getTranslations("content");
  return (
    <p data-testid="vet-warning" role="note" className="rounded-2xl border-2 border-accent bg-soft px-4 py-3 text-sm font-semibold">
      ⚠️ {t("vetWarning")}
    </p>
  );
}
