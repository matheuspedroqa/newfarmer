import type { Metadata } from "next";
import { marketingAlternates } from "@/lib/seo";
import { generateMetadata as baseMetadata } from "../../privacy/page";

// A página é a mesma em inglês; o idioma vem do cabeçalho x-nf-locale posto pelo middleware.
export { default } from "../../privacy/page";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await baseMetadata()), alternates: marketingAlternates("/privacy", "es") };
}
