"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// No celular (< md) vira uma barra fixa embaixo, com ícone e rótulo curto; no computador, o menu lateral com ícone e nome.
export function NavRail({ items, label }: { items: { href: string; icon: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1 bg-rail px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:flex-col md:justify-start md:gap-1 md:self-start md:overflow-y-auto md:px-3 md:py-6 md:pl-[max(0.75rem,env(safe-area-inset-left))]"
      aria-label={label}
    >
      <p className="mb-6 hidden items-center gap-2 px-3 font-display text-xl font-bold text-white md:flex">
        <span aria-hidden>🌾</span> {label}
      </p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl transition-colors duration-150 motion-reduce:transition-none md:min-h-12 md:w-full md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 ${active ? "bg-soft text-text dark:bg-primary dark:text-primary-text" : "text-white hover:bg-white/15"}`}
          >
            <span aria-hidden className="text-xl">{item.icon}</span>
            <span className="text-[11px] leading-tight font-semibold md:text-base">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
