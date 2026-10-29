"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavRail({ items, label }: { items: { href: string; icon: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex w-20 shrink-0 flex-col items-center gap-3 bg-rail py-6" aria-label={label}>
      <p className="mb-6 text-2xl" aria-hidden>🌾</p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${active ? "bg-soft dark:bg-primary" : "hover:bg-white/15"}`}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
