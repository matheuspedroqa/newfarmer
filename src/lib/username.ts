// Regras do username, sem "server-only": os formulários (src/lib/validation.ts) também usam.
export const RESERVED_USERNAMES = new Set(["admin", "root", "newfarmer", "suporte", "support", "api", "login"]);
const PATTERN = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(text: string): string {
  return text.trim().toLowerCase();
}

export function usernameProblem(username: string): null | "usernameInvalid" | "usernameReserved" {
  if (!PATTERN.test(username) || /^\d+$/.test(username)) return "usernameInvalid";
  if (RESERVED_USERNAMES.has(username)) return "usernameReserved";
  return null;
}
