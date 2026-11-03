import "server-only";
import { headers } from "next/headers";

/** Na Vercel o primeiro endereço de x-forwarded-for é o do visitante (a Vercel sobrescreve o cabeçalho). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  // O servidor de desenvolvimento do Next preenche x-forwarded-for com o endereço de loopback.
  return ["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(ip) ? "local" : ip;
}
