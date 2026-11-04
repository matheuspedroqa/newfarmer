import { getTranslations } from "next-intl/server";

export async function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = await getTranslations("onboarding");
  const steps = [t("account"), t("farm"), t("subscription")];
  return (
    <div className="mb-6">
      <p className="text-sm font-bold uppercase tracking-wide text-accent">{t("stepOf", { current })}</p>
      <ol className="mt-2 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i + 1 === current ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-sm ${i + 1 === current ? "bg-primary font-bold text-primary-text" : "border border-border text-muted"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
