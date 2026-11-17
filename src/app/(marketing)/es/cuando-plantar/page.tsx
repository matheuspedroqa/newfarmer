import { CropIndex, cropIndexMetadata } from "@/components/CropGuide";

export const generateMetadata = () => cropIndexMetadata("es");

export default function Page() {
  return <CropIndex lang="es" />;
}
