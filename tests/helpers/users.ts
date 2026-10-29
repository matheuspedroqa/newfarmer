import { createUser, type NewUser } from "@/server/accounts";
import type { Db } from "@/server/db";

export const DEFAULT_PASSWORD = "segredo123";

export function makeUser(db: Db, overrides: Partial<NewUser> = {}): Promise<number> {
  return createUser(db, {
    name: "Ana",
    email: "ana@exemplo.com",
    password: DEFAULT_PASSWORD,
    city: { label: "Campinas, São Paulo, Brasil", latitude: -22.9, longitude: -47.06, countryCode: "BR" },
    climate: { zone: "subtropical", estimated: false, hemisphere: "south" },
    ...overrides,
  });
}
