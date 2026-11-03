import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Locale } from "@/i18n/locales";

export function getLegalText(doc: "privacy" | "terms", locale: Locale): string {
  return fs.readFileSync(path.join(process.cwd(), "content", "legal", `${doc}.${locale}.md`), "utf8");
}
