import type { Metadata } from "next";
import { marketingAlternates } from "@/lib/seo";
import { generateMetadata as baseMetadata } from "../../try/page";

// A página é a mesma em inglês; o idioma vem do cabeçalho x-nf-locale posto pelo middleware.
export { default } from "../../try/page";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await baseMetadata()), alternates: marketingAlternates("/try", "es") };
}
