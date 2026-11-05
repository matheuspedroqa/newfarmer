"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BrowserFrame } from "./BrowserFrame";
import { FloatingCard, VerifiedSeal } from "./DeviceExtras";
import { PhoneFrame } from "./PhoneFrame";

type Shot = { name: string; card: { icon: string; title: string; text: string }; src: { desktop: string; mobile: string }; alt: string; caption: string };

/** Alterna os 3 prints entre computador e celular. */
export function ShowcaseToggle({ shots, labels }: { shots: Shot[]; labels: { desktop: string; mobile: string } }) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  // Em tela pequena o print do computador fica minúsculo: começa no celular (o servidor renderiza "desktop", sem erro de hidratação).
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setMode("mobile");
  }, []);
  const button = (m: "desktop" | "mobile") => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`min-h-11 min-w-28 rounded-full px-5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${mode === m ? "bg-primary text-primary-text" : "text-muted hover:text-text"}`}
    >
      {labels[m]}
    </button>
  );
  return (
    <>
      <div className="mt-6 flex justify-center">
        <div className="inline-flex gap-1 rounded-full bg-surface p-1 ring-1 ring-border">{button("desktop")}{button("mobile")}</div>
      </div>
      <ul className={`mt-8 grid gap-8 ${mode === "desktop" ? "grid-cols-[minmax(0,1fr)] lg:grid-cols-3" : "grid-cols-[minmax(0,1fr)] sm:grid-cols-3"}`}>
        {shots.map((s) => (
          <li key={s.name} data-testid="showcase-item" className="flex min-w-0 flex-col">
            {/* O cartão flutuante fica preso ao print, não ao item: assim não cobre a legenda embaixo. */}
            <div className="relative">
            {mode === "desktop" ? (
              <BrowserFrame>
                <Image src={s.src.desktop} alt={s.alt} width={1440} height={900} sizes="(min-width: 1024px) 380px, 90vw" className="h-auto w-full" />
              </BrowserFrame>
            ) : (
              <PhoneFrame className="mx-auto w-full max-w-48" tilt>
                <Image src={s.src.mobile} alt={s.alt} width={780} height={1688} sizes="(min-width: 640px) 20vw, 192px" className="h-auto w-full" />
              </PhoneFrame>
            )}
            <FloatingCard {...s.card} className={mode === "desktop" ? "-right-2 -bottom-3 w-40" : "right-0 bottom-24 w-36"} />
            {mode === "mobile" && s.name === "dashboard" && <VerifiedSeal className="-left-3 top-2 hidden sm:block" />}
            </div>
            <p className="mt-8 text-center text-sm font-semibold text-muted">{s.caption}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
