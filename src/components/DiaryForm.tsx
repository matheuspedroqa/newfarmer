"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { addDiaryAction } from "@/app/actions/diary";
import { FieldError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";
import { DIARY_KINDS } from "@/lib/validation";

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3";

export function DiaryForm({ animalId, today }: { animalId: string; today: string }) {
  const t = useTranslations("diary");
  const [state, action, pending] = useActionState<FormState, FormData>(addDiaryAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4 rounded-3xl bg-soft p-6">
      <input type="hidden" name="animalId" value={animalId} />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="diary-date" className="mb-1 block text-sm font-semibold">{t("date")}</label>
          <input id="diary-date" name="date" type="date" defaultValue={today} max={today} aria-describedby="diary-date-error" className={inputClass} />
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
      {state.done && <p role="status" className="font-semibold">{t("saved")}</p>}
      <div className="w-60">
        <SubmitButton pending={pending}>{t("save")}</SubmitButton>
      </div>
    </form>
  );
}
