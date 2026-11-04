import { getDb } from "@/server/db";
import { unsubscribeAttempt } from "@/server/marketing";
import { clientIp } from "@/server/request-context";

// Descadastro de um clique (RFC 8058): o provedor de e-mail faz o POST, sem sessão.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const db = await getDb();
  const ip = await clientIp();
  const { result } = await unsubscribeAttempt(db, (await params).token, ip);
  // Token inválido responde 200 como o válido (nada a revelar); só o excesso de inválidos recebe 429.
  return new Response(null, { status: result === "limited" ? 429 : 200 });
}
