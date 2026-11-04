import { cookies } from "next/headers";
import { CONSENT_COOKIE, UUID_RE, VISITOR_COOKIE } from "@/lib/cookies";
import { getCurrentUser } from "@/server/current-user";
import { getDb } from "@/server/db";
import { recordPageView } from "@/server/page-views";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";

const SKIP = ["/api/", "/admin", "/confirm-email/", "/reset-password/"];
const MAX_BODY = 2048;
const none = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  // O consentimento é conferido aqui no servidor: o navegador só pede, não decide.
  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (jar.get(CONSENT_COOKIE)?.value !== "all" || !visitorId || !UUID_RE.test(visitorId)) return none();

  // Corpo limitado antes de interpretar: este endpoint é público.
  if (Number(request.headers.get("content-length")) > MAX_BODY) return none();
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return none(); // sem Content-Length (chunked): confere em bytes
  let body: { path?: unknown; referrer?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return none();
  }
  if (typeof body?.path !== "string") return none();
  const path = body.path.split("?")[0].split("#")[0]; // tokens de e-mail nunca são gravados
  if (!path.startsWith("/") || path.length > 200 || SKIP.some((p) => path.startsWith(p))) return none();
  let referrer = "";
  if (typeof body.referrer === "string" && body.referrer) {
    try {
      referrer = new URL(body.referrer).host.slice(0, 100);
    } catch {
      /* referrer inválido vira vazio */
    }
  }

  const db = await getDb();
  if (!(await limitByIp(db, "track", await clientIp())).ok) return none();
  const user = await getCurrentUser();
  await recordPageView(db, { visitorId, userId: user?.id ?? null, path, referrer });
  return none();
}
