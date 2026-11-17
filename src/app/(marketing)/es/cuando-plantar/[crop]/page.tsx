import { CropGuidePage, cropPageMetadata } from "@/components/CropGuide";

type Props = { params: Promise<{ crop: string }> };

export const generateMetadata = ({ params }: Props) => cropPageMetadata("es", params);

export default function Page({ params }: Props) {
  return <CropGuidePage lang="es" params={params} />;
}
