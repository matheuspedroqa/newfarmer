import { getDb } from "@/server/db";
import { unsubscribeByToken } from "@/server/marketing";
import { limitByIp } from "@/server/rate-limit";
import { clientIp } from "@/server/request-context";

// Descadastro de um clique (RFC 8058): o provedor de e-mail faz o POST, sem sessão.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const db = await getDb();
  const ip = await clientIp();
  if (!(await limitByIp(db, "unsubscribe", ip)).ok) return new Response(null, { status: 429 });
  await unsubscribeByToken(db, (await params).token, ip);
  return new Response(null, { status: 200 });
}
