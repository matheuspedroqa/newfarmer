"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDiaryAction } from "@/app/actions/diary";
import { saveFarmAction } from "@/app/actions/farm";
import { readOutbox, type OutboxItem, removeFromOutbox, useOnline, useOutbox } from "@/lib/outbox";

const ACTIONS = { diary: addDiaryAction, farm: saveFarmAction };
const WARM_EVERY_MS = 60 * 60_000;

// Data e começo do texto, para a pessoa saber qual anotação não foi gravada.
const describe = (item: OutboxItem) => {
  const f = Object.fromEntries(item.fields);
  return item.kind === "diary" ? `${f.date} · ${(f.note ?? "").slice(0, 40)}` : "MyFarm";
};

/** Registra o modo offline, guarda as páginas principais, envia a fila quando há internet e avisa a pessoa. */
export function OfflineSync({ owner, paths, canSend }: { owner: string; paths: string[]; canSend: boolean }) {
  const t = useTranslations("offline");
  const router = useRouter();
  const online = useOnline();
  const waiting = useOutbox().filter((i) => i.owner === owner).length;
  const [sending, setSending] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const busy = useRef(false);

  const flush = useCallback(async () => {
    if (busy.current || !navigator.onLine || !canSend) return; // sem assinatura a ação redirecionaria: a fila fica guardada
    const items = readOutbox().filter((i) => i.owner === owner); // de outra conta neste aparelho: nunca envia com esta
    if (!items.length) return;
    busy.current = true;
    setSending(true);
    let sent = 0;
    for (const item of items) {
      const formData = new FormData();
      for (const [k, v] of item.fields) formData.append(k, v);
      let result;
      try {
        result = await ACTIONS[item.kind]({}, formData);
      } catch {
        break; // a rede caiu de novo: tenta na próxima vez
      }
      if (result.formError === "rateLimited") break;
      removeFromOutbox(item.id);
      if (result.done) sent++;
      else setRejected((r) => [...r, describe(item)]);
    }
    busy.current = false;
    setSending(false);
    if (sent) router.refresh();
  }, [owner, router, canSend]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "owner", owner });
      let last = 0;
      try {
        last = Number(localStorage.getItem(`nf_warm:${owner}`) ?? 0);
      } catch {}
      if (navigator.onLine && Date.now() - last > WARM_EVERY_MS) {
        reg.active?.postMessage({ type: "warm", paths });
        try {
          localStorage.setItem(`nf_warm:${owner}`, String(Date.now()));
        } catch {}
      }
    });
    // shortcut: aquece no máximo 1x por hora; páginas abertas no meio do caminho já ficam guardadas ao visitar.
  }, [owner, paths]);

  useEffect(() => {
    flush();
    const onVisible = () => document.visibilityState === "visible" && flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush]);

  const message = !online
    ? waiting
      ? t("offlineWaiting", { count: waiting })
      : t("offline")
    : sending || waiting
      ? t("sending", { count: waiting })
      : rejected.length
        ? t("rejected", { count: rejected.length, items: rejected.join("; ") })
        : null;
  if (!message) return null;
  return (
    <p role="status" data-testid="offline-status" className="mt-4 rounded-2xl bg-soft px-4 py-3 text-sm font-semibold">
      {message}
    </p>
  );
}
