import { GuideMonth, guideMonthMetadata } from "@/components/PlantGuide";

type Props = { params: Promise<{ country: string; month: string }> };

export const generateMetadata = ({ params }: Props) => guideMonthMetadata("en", params);

export default function Page({ params }: Props) {
  return <GuideMonth lang="en" params={params} />;
}
