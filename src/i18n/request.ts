import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/cookies";
import { resolveLocale } from "./locales";

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
