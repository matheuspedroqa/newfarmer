import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations())("auth.login") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ conta?: string }> }) {
  return <LoginForm accountDeleted={(await searchParams).conta === "apagada"} />;
}
