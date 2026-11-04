import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { marketingAlternates } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.privacy"), alternates: marketingAlternates("/privacy", "en") };
}

export default function Page() {
  return <LegalPage doc="privacy" />;
}
