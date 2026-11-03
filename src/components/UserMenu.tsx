"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UserMenu({ name, isPlatformAdmin }: { name: string; isPlatformAdmin: boolean }) {
  const t = useTranslations("userMenu");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item = "flex items-center gap-2 border-l-2 border-transparent px-4 py-3 transition-colors duration-150 hover:border-primary hover:bg-hover hover:text-primary focus-visible:border-primary focus-visible:bg-hover focus-visible:text-primary motion-reduce:transition-none";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="user-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("open")}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm font-semibold transition-colors duration-150 hover:border-primary hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-reduce:transition-none"
      >
        <span aria-hidden>👤</span> {name} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-border">
          <Link role="menuitem" href="/myfarm" onClick={() => setOpen(false)} className={item}>
            <span aria-hidden>🏡</span> {t("myfarm")}
          </Link>
          <Link role="menuitem" href="/perfil" onClick={() => setOpen(false)} className={item}>
            <span aria-hidden>👤</span> {t("profile")}
          </Link>
          {isPlatformAdmin && (
            <Link role="menuitem" href="/settings/activity" onClick={() => setOpen(false)} className={item}>
              <span aria-hidden>⚙️</span> {t("settings")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
