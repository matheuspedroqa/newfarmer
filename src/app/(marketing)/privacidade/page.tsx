import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.privacy") };
}

export default function Page() {
  return <LegalPage doc="privacy" />;
}
