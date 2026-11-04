"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_COOKIE, VISITOR_COOKIE } from "@/lib/cookies";

const read = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];

export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (read(CONSENT_COOKIE) !== "all") {
      if (read(VISITOR_COOKIE)) document.cookie = `${VISITOR_COOKIE}=; path=/; max-age=0`;
      return;
    }
    if (!read(VISITOR_COOKIE)) document.cookie = `${VISITOR_COOKIE}=${crypto.randomUUID()}; path=/; max-age=31536000; samesite=lax`;
    navigator.sendBeacon("/api/track", JSON.stringify({ path: pathname, referrer: document.referrer }));
  }, [pathname]);
  return null;
}
