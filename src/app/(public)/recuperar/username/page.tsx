import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UsernameForm } from "./UsernameForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.recover") };
}

export default function ForgotUsernamePage() {
  return <UsernameForm />;
}
