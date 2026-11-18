"use client";

import { useEffect } from "react";

/** Avisa o dono do site que alguém abriu o cadastro (o servidor limita a 1 aviso por IP a cada hora). */
export function RegisterAlert() {
  useEffect(() => {
    navigator.sendBeacon("/api/alert/register", JSON.stringify({ referrer: document.referrer }));
  }, []);
  return null;
}
