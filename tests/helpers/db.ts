import { openDb, type Db } from "@/server/db";

export function testDb(): Db {
  return openDb(":memory:");
}
