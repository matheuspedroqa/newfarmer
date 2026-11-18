import { getDb } from "@/server/db";
import { alertOwner } from "@/server/owner-alerts";
import { clientIp, visitLocation } from "@/server/request-context";

const MAX_BODY = 512;

/** A página /register avisa por aqui quando abre no navegador (robô sem JavaScript não dispara). */
export async function POST(request: Request) {
  const raw = (await request.text()).slice(0, MAX_BODY);
  let from = "";
  try {
    const ref = JSON.parse(raw)?.referrer;
    if (typeof ref === "string" && ref) from = new URL(ref).host.slice(0, 100);
  } catch {
    /* corpo ou referrer inválido: segue sem a origem */
  }
  const db = await getDb();
  const { city, country } = await visitLocation();
  await alertOwner(db, "register", { País: country, Cidade: city, "Veio de": from || "acesso direto", Idioma: request.headers.get("accept-language")?.split(",")[0] ?? "" }, await clientIp());
  return new Response(null, { status: 204 });
}
