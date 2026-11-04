"use client";

import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { ANIMALS, CROPS, CROP_GROUPS } from "@/lib/catalog";
import { offlineAware } from "@/lib/outbox";
import { farmSchema, parseFarmForm, toFieldErrors } from "@/lib/validation";
import type { Farm } from "@/server/farm";
import { FieldError } from "./FieldError";
import { SubmitButton } from "./SubmitButton";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function validateFarm(formData: FormData): FormState | null {
  const parsed = farmSchema.safeParse(parseFarmForm(formData));
  return parsed.success ? null : { fieldErrors: toFieldErrors(parsed.error) };
}

// Campos controlados: o React 19 limpa formulários depois de cada envio, e os controlados mantêm o que foi digitado.
export function FarmForm({
  initial,
  action,
  submitLabel,
  footer,
  offlineOwner,
}: {
  initial: Farm;
  action: Action;
  submitLabel: string;
  footer?: React.ReactNode;
  /** Com o username, salvar sem internet guarda na fila do aparelho (só no MyFarm). */
  offlineOwner?: string;
}) {
  const t = useTranslations();
  const wrapped = useMemo(
    () => (offlineOwner ? offlineAware(offlineOwner, "farm", action, validateFarm) : action),
    [offlineOwner, action],
  );
  const [state, formAction, pending] = useActionState<FormState, FormData>(wrapped, {});
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(initial.animals.map((a) => [a.id, String(a.count)])),
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(initial.animals.map((a) => [a.id, true])),
  );
  const [crops, setCrops] = useState<Set<string>>(new Set(initial.crops));
  const errors = state.fieldErrors ?? {};

  function toggleCrop(id: string, on: boolean) {
    setCrops((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={formAction} noValidate className="space-y-10">
      <section id="animals" className="scroll-mt-6">
        <h2 className="font-display text-2xl font-bold">{t("farm.animalsTitle")}</h2>
        <p className="text-sm text-muted">{t("farm.animalsHelp")}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {ANIMALS.map((animal) => {
            const on = checked[animal.id] ?? false;
            return (
              <div
                key={animal.id}
                className={`rounded-3xl p-5 transition ${on ? "bg-soft ring-2 ring-primary" : "bg-surface ring-1 ring-border"}`}
              >
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name={`animal:${animal.id}`}
                    checked={on}
                    onChange={(e) => setChecked((c) => ({ ...c, [animal.id]: e.target.checked }))}
                    className="h-5 w-5 accent-primary"
                  />
                  <span className="text-3xl" aria-hidden>{animal.icon}</span>
                  <span className="font-semibold">{t(`animals.${animal.id}`)}</span>
                </label>
                {on && (
                  <div className="mt-3">
                    <label htmlFor={`count-${animal.id}`} className="text-sm text-muted">{t("farm.howMany")}</label>
                    <input
                      id={`count-${animal.id}`}
                      name={`count:${animal.id}`}
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      inputMode="numeric"
                      value={counts[animal.id] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [animal.id]: e.target.value }))}
                      aria-describedby={`count-${animal.id}-error`}
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                    />
                    <FieldError id={`count-${animal.id}-error`} code={errors[`animals.${animal.id}`]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section id="crops" className="scroll-mt-6">
        <h2 className="font-display text-2xl font-bold">{t("farm.cropsTitle")}</h2>
        <p className="text-sm text-muted">{t("farm.cropsHelp")}</p>
        {CROP_GROUPS.map((group) => (
          <fieldset key={group} className="mt-5">
            <legend className="mb-2 font-semibold text-accent">{t(`cropGroups.${group}`)}</legend>
            <div className="flex flex-wrap gap-2">
              {CROPS.filter((c) => c.group === group).map((crop) => (
                <label
                  key={crop.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 ring-1 ring-border has-[:checked]:bg-soft has-[:checked]:ring-2 has-[:checked]:ring-primary"
                >
                  <input
                    type="checkbox"
                    name="crop"
                    value={crop.id}
                    checked={crops.has(crop.id)}
                    onChange={(e) => toggleCrop(crop.id, e.target.checked)}
                    className="accent-primary"
                  />
                  <span aria-hidden>{crop.icon}</span>
                  {t(`crops.${crop.id}`)}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{t(`errors.${state.formError}`)}</p>}
      {state.done && (
        <p role="status" className="rounded-xl bg-soft px-4 py-3 font-semibold">{t("farm.saved")}</p>
      )}
      {state.queued && <p role="status" className="rounded-xl bg-soft px-4 py-3 font-semibold">{t("farm.queued")}</p>}
      <div className="flex flex-wrap items-center gap-6">
        <div className="w-full sm:w-60">
          <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
        </div>
        {footer}
      </div>
    </form>
  );
}
