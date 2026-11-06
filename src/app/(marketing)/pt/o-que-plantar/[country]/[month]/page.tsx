import { GuideMonth, guideMonthMetadata } from "@/components/PlantGuide";

type Props = { params: Promise<{ country: string; month: string }> };

export const generateMetadata = ({ params }: Props) => guideMonthMetadata("pt", params);

export default function Page({ params }: Props) {
  return <GuideMonth lang="pt" params={params} />;
}
