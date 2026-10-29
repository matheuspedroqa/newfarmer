"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { CityChoice } from "@/lib/validation";
import { FieldError } from "./FieldError";

export function CityPicker({ error }: { error?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CityChoice[]>([]);
  const [selected, setSelected] = useState<CityChoice | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "empty" | "failed">("idle");

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setOptions([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}&locale=${locale}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const list = (await response.json()) as CityChoice[];
        setOptions(list);
        setStatus(list.length ? "idle" : "empty");
      } catch {
        if (!controller.signal.aborted) setStatus("failed");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected, locale]);

  const shownError = status === "empty" ? "cityNotFound" : status === "failed" ? "citySearchFailed" : error;

  return (
    <div className="relative">
      <label htmlFor="city" className="mb-1 block text-sm font-semibold">
        {t("city")}
      </label>
      <input
        id="city"
        data-testid="city-input"
        value={selected ? selected.label : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
        }}
        placeholder={t("cityPlaceholder")}
        autoComplete="off"
        aria-invalid={Boolean(shownError)}
        aria-describedby="city-error"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3"
      />
      <input type="hidden" name="city" value={selected ? JSON.stringify(selected) : ""} />
      {status === "searching" && <p className="mt-1 text-sm text-muted">{t("citySearching")}</p>}
      {options.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {options.map((city) => (
            <li key={`${city.latitude},${city.longitude}`}>
              <button
                type="button"
                data-testid="city-option"
                onClick={() => {
                  setSelected(city);
                  setOptions([]);
                }}
                className="w-full px-4 py-2 text-left hover:bg-soft"
              >
                {city.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldError id="city-error" code={shownError} />
    </div>
  );
}
