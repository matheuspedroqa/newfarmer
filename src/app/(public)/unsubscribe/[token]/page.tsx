import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unsubscribeAction } from "@/app/actions/marketing";
import { AuthCard } from "@/components/AuthCard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("unsubscribe.title"), robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ r?: string }> }) {
  const [{ token }, { r }, t] = await Promise.all([params, searchParams, getTranslations()]);
  return (
    <AuthCard title={t("unsubscribe.title")}>
      {r === "ok" ? (
        <p role="status" className="rounded-xl bg-soft px-4 py-3">{t("unsubscribe.done")}</p>
      ) : (
        <form action={unsubscribeAction} className="space-y-4">
          {r === "invalid" && <p role="alert" className="text-sm text-danger">{t("unsubscribe.invalid")}</p>}
          {r === "limited" && <p role="alert" className="text-sm text-danger">{t("errors.rateLimited")}</p>}
          <p>{t("unsubscribe.question")}</p>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 font-bold text-white">
            {t("unsubscribe.confirm")}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
