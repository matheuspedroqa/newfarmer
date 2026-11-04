"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsTabs({ tabs, label }: { tabs: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-2 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 py-2 font-semibold whitespace-nowrap md:min-h-0 ${active ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
