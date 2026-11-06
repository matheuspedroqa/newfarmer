import { GuideIndex, guideIndexMetadata } from "@/components/PlantGuide";

export const generateMetadata = () => guideIndexMetadata("pt");

export default function Page() {
  return <GuideIndex lang="pt" />;
}
