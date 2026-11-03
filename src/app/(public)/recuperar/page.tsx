import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotForm } from "./ForgotForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.recover") };
}

export default function ForgotPage() {
  return <ForgotForm />;
}
