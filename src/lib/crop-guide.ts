import type { Locale } from "@/i18n/locales";
import { CROP_IDS, type CropId } from "./catalog";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import pt from "../../messages/pt.json";

// Páginas públicas "quando plantar <cultura>", com o nome da cultura no endereço na língua da página.
export const CROP_GUIDE_BASE: Record<Locale, string> = { en: "/when-to-plant", pt: "/pt/quando-plantar", es: "/es/cuando-plantar" };

const NAMES: Record<Locale, Record<string, string>> = { en: en.crops, pt: pt.crops, es: es.crops };
const slugify = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cropSlug = (lang: Locale, id: CropId) => slugify(NAMES[lang][id]);

export const cropGuidePath = (lang: Locale, id?: CropId) => (id ? `${CROP_GUIDE_BASE[lang]}/${cropSlug(lang, id)}` : CROP_GUIDE_BASE[lang]);

/** Endereço da mesma página em cada idioma (para hreflang e sitemap). */
export const cropGuidePaths = (id?: CropId): Record<Locale, string> =>
  ({ en: cropGuidePath("en", id), pt: cropGuidePath("pt", id), es: cropGuidePath("es", id) });

export const parseCropSlug = (lang: Locale, slug: string): CropId | null => CROP_IDS.find((id) => cropSlug(lang, id) === slug) ?? null;
