import { getTranslations } from "next-intl/server";
import { saveFarmAction } from "@/app/actions/farm";
import { FarmForm } from "@/components/FarmForm";
import { requireAccess } from "@/server/current-user";
import { getDb } from "@/server/db";
import { getFarm } from "@/server/farm";

/** Uma aba do MyFarm: mostra só Animais ou só Plantações; o resto vai escondido no envio. */
export async function FarmTab({ only }: { only: "animals" | "crops" }) {
  const user = await requireAccess();
  const t = await getTranslations();
  return <FarmForm initial={await getFarm(await getDb(), user.id)} action={saveFarmAction} submitLabel={t("farm.save")} offlineOwner={user.username} only={only} />;
}

export async function farmMetadata() {
  return { title: (await getTranslations())("nav.myfarm") };
}
