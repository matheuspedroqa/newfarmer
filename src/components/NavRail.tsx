"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// No celular (< md) vira uma barra fixa embaixo, com ícone e rótulo curto; no computador, o trilho à esquerda.
export function NavRail({ items, label }: { items: { href: string; icon: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1 bg-rail px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:static md:w-20 md:shrink-0 md:flex-col md:items-center md:justify-start md:gap-3 md:px-0 md:py-6"
      aria-label={label}
    >
      <p className="mb-6 hidden text-2xl md:block" aria-hidden>🌾</p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl text-xl transition-colors duration-150 motion-reduce:transition-none md:h-12 md:min-h-0 md:w-12 md:flex-none ${active ? "bg-soft text-text dark:bg-primary dark:text-primary-text" : "text-white hover:bg-white/15"}`}
          >
            <span aria-hidden>{item.icon}</span>
            <span aria-hidden className="text-[11px] leading-tight font-semibold md:hidden">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
