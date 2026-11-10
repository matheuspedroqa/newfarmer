import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CityForm } from "@/components/CityForm";
import { requireUser, subscriptionOf } from "@/server/current-user";
import { mustCancelFirst } from "@/server/subscriptions";
import { DeleteAccountForm } from "./DeleteAccountForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("profile.title") };
}

/** Meus Dados: informações da conta, baixar os dados e apagar a conta. */
export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations();
  const cancelFirst = mustCancelFirst(await subscriptionOf(user.id));
  const info: [string, string][] = [
    [t("profile.name"), user.name],
    [t("auth.username"), user.username],
    [t("profile.email"), user.email],
    [t("profile.city"), user.cityLabel],
    [t("profile.climate"), `${t(`climate.${user.climateZone}`)} · ${t(`climate.${user.hemisphere}`)}`],
  ];

  return (
    <>
      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.info")}</h2>
        <dl data-testid="profile-info" className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{label}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("myfarm.cityTitle")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("myfarm.currentCity")}: <b data-testid="current-city">{user.cityLabel}</b>
        </p>
        <CityForm />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.dataTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.dataHelp")}</p>
        <a
          href="/api/account/data"
          download
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-primary px-5 py-3 font-bold transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-60"
        >
          {t("profile.download")}
        </a>
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-danger/40">
        <h2 className="font-display text-2xl font-bold text-danger">{t("profile.deleteTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.deleteHelp")}</p>
        {cancelFirst ? (
          <p data-testid="delete-cancel-first" className="rounded-xl bg-soft px-4 py-3">
            {t("profile.deleteCancelFirst")}{" "}
            <Link href="/profile/subscription" className="font-semibold text-primary underline">{t("profile.deleteGoCancel")}</Link>
          </p>
        ) : (
          <DeleteAccountForm />
        )}
      </div>
    </>
  );
}
