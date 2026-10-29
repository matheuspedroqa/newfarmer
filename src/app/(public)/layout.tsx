import { getTranslations } from "next-intl/server";
import { TopControls } from "@/components/TopControls";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <div className="grid min-h-screen grid-cols-2">
      <div className="relative overflow-hidden bg-[url('/landscape.svg')] bg-cover bg-bottom dark:brightness-[.55]">
        <div className="absolute inset-x-10 bottom-10 rounded-2xl bg-white/70 p-6 backdrop-blur dark:bg-black/50">
          <p className="font-display text-2xl font-bold text-[#2e2a22] dark:text-[#ece6d6]">{t("quote")}</p>
          <p className="mt-2 text-sm text-[#2e2a22]/80 dark:text-[#ece6d6]/80">{t("quoteHelp")}</p>
        </div>
      </div>
      <div className="flex flex-col px-16 py-8">
        <header className="flex items-center justify-between">
          <p className="font-display text-2xl font-bold text-primary">🌾 {t("name")}</p>
          <TopControls />
        </header>
        <main className="m-auto flex w-full justify-center py-10">{children}</main>
      </div>
    </div>
  );
}
