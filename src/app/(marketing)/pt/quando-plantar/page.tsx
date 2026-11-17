import { CropIndex, cropIndexMetadata } from "@/components/CropGuide";

export const generateMetadata = () => cropIndexMetadata("pt");

export default function Page() {
  return <CropIndex lang="pt" />;
}
