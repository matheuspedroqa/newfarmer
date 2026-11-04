/** Rota para o registro de erros: o padrão ("/reset-password/[token]"), nunca o caminho real, que pode carregar token. */
export function errorRoute(context: { routePath?: string }): string {
  return context.routePath || "unknown";
}
