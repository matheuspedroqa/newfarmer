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
  only,
}: {
  initial: Farm;
  action: Action;
  submitLabel: string;
  footer?: React.ReactNode;
  /** Com o username, salvar sem internet guarda na fila do aparelho (só no MyFarm). */
  offlineOwner?: string;
  /** Abas do MyFarm: mostra só uma parte; a outra vai escondida para o salvar não apagá-la. */
  only?: "animals" | "crops";
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
  const [query, setQuery] = useState("");
  // Busca sem acento e sem maiúscula ("acai" acha "Açaí"); o que não bate só some da tela e continua no formulário.
  const plain = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = (id: string) => !query || plain(t(`crops.${id}`)).includes(plain(query));
  const card = "rounded-3xl bg-surface p-5 ring-1 ring-border md:p-6";

  function toggleCrop(id: string, on: boolean) {
    setCrops((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={formAction} noValidate className="space-y-6">
      {only === "crops" && initial.animals.map((a) => (
        <span key={a.id} hidden>
          <input type="hidden" name={`animal:${a.id}`} value="on" />
          <input type="hidden" name={`count:${a.id}`} value={a.count} />
        </span>
      ))}
      {only === "animals" && initial.crops.map((id) => <input key={id} type="hidden" name="crop" value={id} />)}
      {only !== "crops" && <section id="animals" className={`scroll-mt-6 ${card}`}>
        <h2 className="font-display text-2xl font-bold">{t("farm.animalsTitle")}</h2>
        <p className="text-sm text-muted">{t("farm.animalsHelp")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ANIMALS.map((animal) => {
            const on = checked[animal.id] ?? false;
            return (
              <div
                key={animal.id}
                className={`relative rounded-2xl p-3 transition ${on ? "bg-soft ring-2 ring-primary" : "bg-bg ring-1 ring-border hover:ring-primary/60"}`}
              >
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 text-center">
                  <input
                    type="checkbox"
                    name={`animal:${animal.id}`}
                    checked={on}
                    onChange={(e) => setChecked((c) => ({ ...c, [animal.id]: e.target.checked }))}
                    className="absolute top-3 right-3 h-5 w-5 accent-primary"
                  />
                  <span className="text-4xl" aria-hidden>{animal.icon}</span>
                  <span className="font-semibold">{t(`animals.${animal.id}`)}</span>
                </label>
                {on && (
                  <div className="mt-2">
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
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-center"
                    />
                    <FieldError id={`count-${animal.id}-error`} code={errors[`animals.${animal.id}`]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>}

      {only !== "animals" && <section id="crops" className={`scroll-mt-6 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{t("farm.cropsTitle")}</h2>
          <p className="text-sm font-semibold text-accent" aria-live="polite">{t("farm.cropsCount", { count: crops.size })}</p>
        </div>
        <p className="text-sm text-muted">{t("farm.cropsHelp")}</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("farm.cropsSearch")}
          aria-label={t("farm.cropsSearch")}
          className="mt-4 w-full rounded-xl border border-border bg-bg px-4 py-3"
        />
        {crops.size > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("farm.cropsChosen")}>
            {CROPS.filter((c) => crops.has(c.id)).map((crop) => (
              <li key={crop.id}>
                <button
                  type="button"
                  onClick={() => toggleCrop(crop.id, false)}
                  aria-label={t("farm.cropsRemove", { name: t(`crops.${crop.id}`) })}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-sm font-semibold text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span aria-hidden>{crop.icon}</span> {t(`crops.${crop.id}`)} <span aria-hidden>✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl bg-bg p-3 ring-1 ring-border md:max-h-[28rem]">
          {CROP_GROUPS.map((group) => {
            const inGroup = CROPS.filter((c) => c.group === group);
            return (
              <fieldset key={group} className={`mt-4 first:mt-0 ${inGroup.some((c) => matches(c.id)) ? "" : "hidden"}`}>
                <legend className="mb-2 font-semibold text-accent">{t(`cropGroups.${group}`)}</legend>
                <div className="flex flex-wrap gap-2">
                  {inGroup.map((crop) => (
                    <label
                      key={crop.id}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 ring-1 ring-border has-[:checked]:bg-soft has-[:checked]:ring-2 has-[:checked]:ring-primary ${matches(crop.id) ? "" : "hidden"}`}
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
            );
          })}
          {!CROPS.some((c) => matches(c.id)) && <p className="p-2 text-sm text-muted">{t("farm.cropsNone")}</p>}
        </div>
      </section>}

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
