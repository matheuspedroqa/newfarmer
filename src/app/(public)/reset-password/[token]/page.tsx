import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetForm } from "./ResetForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("meta.recover"), robots: { index: false, follow: false } };
}

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetForm token={token} />;
}
