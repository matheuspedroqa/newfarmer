import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/current-user";
import { LanguageForm } from "./LanguageForm";
import { PasswordForm } from "./PasswordForm";

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  const t = await getTranslations();
  const info: [string, string][] = [
    [t("profile.name"), user.name],
    [t("profile.email"), user.email],
    [t("profile.city"), user.cityLabel],
    [t("profile.climate"), `${t(`climate.${user.climateZone}`)} · ${t(`climate.${user.hemisphere}`)}`],
  ];

  return (
    <section className="max-w-4xl space-y-8">
      <h1 className="font-display text-4xl font-bold">{t("profile.title")}</h1>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.info")}</h2>
        <dl data-testid="profile-info" className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl font-bold">{t("profile.languageTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.languageHelp")}</p>
        <LanguageForm current={user.locale} />
      </div>

      <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <h2 className="mb-4 font-display text-2xl font-bold">{t("profile.passwordTitle")}</h2>
        <PasswordForm />
      </div>
    </section>
  );
}
