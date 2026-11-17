import { CropGuidePage, cropPageMetadata } from "@/components/CropGuide";

type Props = { params: Promise<{ crop: string }> };

export const generateMetadata = ({ params }: Props) => cropPageMetadata("en", params);

export default function Page({ params }: Props) {
  return <CropGuidePage lang="en" params={params} />;
}
