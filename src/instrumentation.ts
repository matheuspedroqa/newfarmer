import type { Instrumentation } from "next";
import { errorRoute } from "@/lib/error-route";

/** Erro no servidor vira uma linha em error_logs (rota, mensagem curta, hora). Nunca corpo nem cabeçalhos. */
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  // O import fica dentro do if para o pacote do Edge (middleware) não levar o driver do banco.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getDb } = await import("@/server/db");
      const { logRequestError } = await import("@/server/monitoring");
      const message = error instanceof Error ? error.message : String(error);
      // Só o padrão da rota: o caminho real pode ter token (/recuperar/<token>).
      await logRequestError(await getDb(), errorRoute(context), message);
    } catch {
      // Banco fora do ar: não há onde gravar, e o registro nunca pode derrubar o site.
    }
  }
};
