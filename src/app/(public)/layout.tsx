import { getTranslations } from "next-intl/server";
import { TopControls } from "@/components/TopControls";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* A paisagem só aparece do tablet para cima; no celular o formulário ocupa a tela. */}
      <div className="relative hidden overflow-hidden md:block bg-[url('/landscape.svg')] bg-cover bg-bottom dark:brightness-[.55]">
        <div className="absolute inset-x-10 bottom-10 rounded-2xl bg-white/70 p-6 backdrop-blur dark:bg-black/50">
          <p className="font-display text-2xl font-bold text-[#2e2a22] dark:text-[#ece6d6]">{t("quote")}</p>
          <p className="mt-2 text-sm text-[#2e2a22]/80 dark:text-[#ece6d6]/80">{t("quoteHelp")}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col px-5 py-6 md:px-16 md:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-2xl font-bold text-primary">🌾 {t("name")}</p>
          <TopControls />
        </header>
        <main className="m-auto flex w-full justify-center py-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
