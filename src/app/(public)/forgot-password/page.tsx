import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotForm } from "./ForgotForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.recover"), robots: { index: false, follow: false } };
}

export default function ForgotPage() {
  return <ForgotForm />;
}
