import { normalizeUsername } from "@/lib/username";
import { createUser, type NewUser } from "@/server/accounts";
import type { Db } from "@/server/db";

export const DEFAULT_PASSWORD = "segredo123";

// Sem username informado, usa o começo do e-mail (ana@exemplo.com → "ana"): vários usuários com e-mails diferentes não colidem.
export function makeUser(db: Db, overrides: Partial<NewUser> = {}): Promise<number> {
  const email = overrides.email ?? "ana@exemplo.com";
  return createUser(db, {
    name: "Ana",
    email,
    username: normalizeUsername(email.split("@")[0]),
    password: DEFAULT_PASSWORD,
    city: { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" },
    climate: { zone: "subtropical", estimated: false, hemisphere: "south" },
    ...overrides,
  });
}
