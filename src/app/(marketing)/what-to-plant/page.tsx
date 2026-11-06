import { GuideIndex, guideIndexMetadata } from "@/components/PlantGuide";

export const generateMetadata = () => guideIndexMetadata("en");

export default function Page() {
  return <GuideIndex lang="en" />;
}
