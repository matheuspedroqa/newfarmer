import type { Metadata } from "next";
import { marketingAlternates } from "@/lib/seo";
import { generateMetadata as baseMetadata } from "../../terms/page";

// A página é a mesma em inglês; o idioma vem do cabeçalho x-nf-locale posto pelo middleware.
export { default } from "../../terms/page";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await baseMetadata()), alternates: marketingAlternates("/terms", "pt") };
}
