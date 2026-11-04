"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { addDiaryAction } from "@/app/actions/diary";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";
import { offlineAware, useOutbox } from "@/lib/outbox";
import { DIARY_KINDS, diarySchema, toFieldErrors } from "@/lib/validation";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

function validate(formData: FormData): FormState | null {
  const parsed = diarySchema.safeParse(Object.fromEntries(formData));
  return parsed.success ? null : { fieldErrors: toFieldErrors(parsed.error) };
}

export function DiaryForm({ animalId, today, owner }: { animalId: string; today: string; owner: string }) {
  const t = useTranslations("diary");
  const tErrors = useTranslations("errors");
  const action = useMemo(() => offlineAware(owner, "diary", addDiaryAction, validate), [owner]);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};
  // A página pode ter sido guardada no aparelho dias atrás: "hoje" vem do relógio do celular.
  const [localToday, setLocalToday] = useState(today);
  useEffect(() => setLocalToday(new Date().toLocaleDateString("sv")), []);
  // Etiqueta nova a cada envio: se a mesma anotação chegar duas vezes, o servidor grava uma.
  const [clientId, setClientId] = useState("");
  useEffect(() => setClientId(crypto.randomUUID()), [state]);
  const waiting = useOutbox().filter((i) => i.kind === "diary" && i.owner === owner && i.fields.some(([k, v]) => k === "animalId" && v === animalId));

  return (
    <form action={formAction} noValidate className="space-y-4 rounded-3xl bg-soft p-4 md:p-6">
      <input type="hidden" name="animalId" value={animalId} />
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="diary-date" className="mb-1 block text-sm font-semibold">{t("date")}</label>
          <input key={localToday} id="diary-date" name="date" type="date" defaultValue={localToday} max={localToday} aria-describedby="diary-date-error" className={inputClass} />
          <FieldError id="diary-date-error" code={errors.date} />
        </div>
        <div>
          <label htmlFor="diary-kind" className="mb-1 block text-sm font-semibold">{t("kind")}</label>
          <select id="diary-kind" name="kind" defaultValue="other" className={inputClass}>
            {DIARY_KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="diary-name" className="mb-1 block text-sm font-semibold">{t("animalName")}</label>
          <input id="diary-name" name="animalName" maxLength={60} placeholder={t("animalNameHint")} aria-describedby="diary-name-error" className={inputClass} />
          <FieldError id="diary-name-error" code={errors.animalName} />
        </div>
      </div>
      <div>
        <label htmlFor="diary-note" className="mb-1 block text-sm font-semibold">{t("note")}</label>
        <textarea id="diary-note" name="note" rows={3} maxLength={1000} aria-describedby="diary-note-error" className={inputClass} />
        <FieldError id="diary-note-error" code={errors.note} />
      </div>
      {state.formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{tErrors(state.formError)}</p>}
      {state.done && <p role="status" className="font-semibold">{t("saved")}</p>}
      {state.queued && <p role="status" className="font-semibold">{t("queued")}</p>}
      <div className="w-full sm:w-60">
        <SubmitButton pending={pending}>{t("save")}</SubmitButton>
      </div>
      {waiting.length > 0 && (
        <div data-testid="diary-waiting" className="rounded-2xl border border-dashed border-border p-4">
          <p className="text-sm font-semibold">{t("waitingTitle", { count: waiting.length })}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {waiting.map((i) => {
              const f = Object.fromEntries(i.fields);
              return <li key={i.id} className="[overflow-wrap:anywhere]">{f.date} · {t(`kinds.${f.kind}`)} · {f.note}</li>;
            })}
          </ul>
        </div>
      )}
    </form>
  );
}
