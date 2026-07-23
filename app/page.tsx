import DealsApp from "./deals-app";
import { getDeals } from "@/lib/deals-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <DealsApp initialDeals={await getDeals()} />;
}
