import "server-only";
import { headers } from "next/headers";

/** Na Vercel o primeiro endereço de x-forwarded-for é o do visitante (a Vercel sobrescreve o cabeçalho). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  // O servidor de desenvolvimento do Next preenche x-forwarded-for com o endereço de loopback.
  return ["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(ip) ? "local" : ip;
}

/** A Vercel manda a cidade (codificada para URL) e o país de cada visita; fora dela os dois ficam vazios. */
export async function visitLocation() {
  const h = await headers();
  let city = "";
  try {
    city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "").slice(0, 80);
  } catch {
    /* cidade mal codificada vira vazia */
  }
  const country = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  return { city, country: /^[A-Z]{2}$/.test(country) ? country : "" };
}
