import { GuideMonth, guideMonthMetadata } from "@/components/PlantGuide";

type Props = { params: Promise<{ country: string; month: string }> };

export const generateMetadata = ({ params }: Props) => guideMonthMetadata("es", params);

export default function Page({ params }: Props) {
  return <GuideMonth lang="es" params={params} />;
}
