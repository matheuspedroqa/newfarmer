import { FarmTab, farmMetadata } from "./FarmTab";

export const generateMetadata = farmMetadata;

export default function MyFarmAnimalsPage() {
  return <FarmTab only="animals" />;
}
