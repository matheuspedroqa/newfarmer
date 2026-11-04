import { useSyncExternalStore } from "react";
import type { FormState } from "@/app/actions/auth";

// Fila de envio no aparelho: o que foi salvo sem internet espera aqui e vai quando a conexão volta.
// shortcut: localStorage (~5 MB, só texto) basta para anotações; trocar por IndexedDB se entrar foto.
export type OutboxKind = "diary" | "farm";
export type OutboxItem = { id: string; owner: string; kind: OutboxKind; fields: [string, string][]; createdAt: number };

const KEY = "nf_outbox";
const EVENT = "nf-outbox";

export function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // aparelho sem espaço ou navegação privada: a tela avisa pelo estado "queued" mesmo assim
  }
  window.dispatchEvent(new Event(EVENT));
}

export function enqueue(owner: string, kind: OutboxKind, formData: FormData): OutboxItem {
  const fields = [...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string" && !e[0].startsWith("$ACTION"));
  const item = { id: crypto.randomUUID(), owner, kind, fields, createdAt: Date.now() };
  // MyFarm manda a criação inteira: só a última versão importa.
  const rest = readOutbox().filter((i) => !(kind === "farm" && i.kind === "farm" && i.owner === owner));
  write([...rest, item]);
  return item;
}

export const removeFromOutbox = (id: string) => write(readOutbox().filter((i) => i.id !== id));

/** Ao sair ou apagar a conta: nada desta pessoa fica no aparelho (fila e páginas guardadas). */
export function forgetDevice() {
  write([]);
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("nf_warm:")) localStorage.removeItem(key);
  } catch {}
  navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
}

let cache: { raw: string | null; items: OutboxItem[] } = { raw: null, items: [] };
function snapshot(): OutboxItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) cache = { raw, items: readOutbox() };
  return cache.items;
}
const empty: OutboxItem[] = [];
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
export const useOutbox = () => useSyncExternalStore(subscribe, snapshot, () => empty);

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Envolve a ação do formulário: sem internet (ou se a conexão cair no envio), guarda na fila em vez de dar erro. */
export function offlineAware(owner: string, kind: OutboxKind, action: Action, validate: (formData: FormData) => FormState | null): Action {
  return async (prev, formData) => {
    const invalid = validate(formData);
    if (invalid) return invalid;
    const queue = (): FormState => (enqueue(owner, kind, formData), { queued: true });
    if (!navigator.onLine) return queue();
    try {
      return await action(prev, formData);
    } catch (error) {
      // fetch sem rede dá TypeError; erro do servidor vem de outro tipo e segue para a tela de erro
      if (error instanceof TypeError || !navigator.onLine) return queue();
      throw error;
    }
  };
}
