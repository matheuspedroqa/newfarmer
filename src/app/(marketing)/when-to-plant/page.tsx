import { CropIndex, cropIndexMetadata } from "@/components/CropGuide";

export const generateMetadata = () => cropIndexMetadata("en");

export default function Page() {
  return <CropIndex lang="en" />;
}
