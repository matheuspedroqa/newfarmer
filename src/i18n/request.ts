import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/cookies";
import { resolveLocale } from "./locales";

export default getRequestConfig(async () => {
  // O middleware põe x-nf-locale em /pt/*; o cabeçalho vence o cookie.
  const locale = resolveLocale((await headers()).get("x-nf-locale") ?? (await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
