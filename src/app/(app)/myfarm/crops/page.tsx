import { FarmTab, farmMetadata } from "../FarmTab";

export const generateMetadata = farmMetadata;

export default function MyFarmCropsPage() {
  return <FarmTab only="crops" />;
}
