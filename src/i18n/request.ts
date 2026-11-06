import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/cookies";
import { browserLocale, resolveLocale } from "./locales";

export default getRequestConfig(async () => {
  // O middleware põe x-nf-locale em /pt/*; o cabeçalho vence o cookie. Sem escolha salva, vale o idioma do navegador.
  const h = await headers();
  const locale = resolveLocale(h.get("x-nf-locale") ?? (await cookies()).get(LOCALE_COOKIE)?.value ?? browserLocale(h.get("accept-language")));
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
