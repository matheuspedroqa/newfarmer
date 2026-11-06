import { GuideIndex, guideIndexMetadata } from "@/components/PlantGuide";

export const generateMetadata = () => guideIndexMetadata("es");

export default function Page() {
  return <GuideIndex lang="es" />;
}
