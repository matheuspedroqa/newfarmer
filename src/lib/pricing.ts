export type Currency = "brl" | "eur" | "usd";
export const PRICES: Record<Currency, number> = { brl: 699, eur: 199, usd: 200 }; // centavos por mês
// UE + EEE + demais países europeus
const EUROPE = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","CH","GB","AD","MC","SM","VA","AL","BA","ME","MK","RS","MD","UA","XK"]);

export function currencyForCountry(country: string | null | undefined): Currency {
  const c = (country ?? "").toUpperCase();
  return c === "BR" ? "brl" : EUROPE.has(c) ? "eur" : "usd";
}

export function formatMoney(currency: Currency, cents: number, locale: "pt" | "en"): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export const formatPrice = (currency: Currency, locale: "pt" | "en"): string => formatMoney(currency, PRICES[currency], locale);
