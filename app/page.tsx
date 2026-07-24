import DealsApp from "./deals-app";
import { getDeals } from "@/lib/deals-store";

import HomeCategoryShowcase from "@/components/home-category-showcase";
export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <DealsApp initialDeals={await getDeals()} />
      <HomeCategoryShowcase />
    </>
  );
}
