import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import DealsApp from "@/app/deals-app";
import { getDeals } from "@/lib/deals-store";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Grocery Deals | Deals Ads",
  description:
    "Browse cached grocery and daily-essential deals from supported quick-commerce providers.",
  alternates: {
    canonical: "/grocery",
  },
};

const getCachedGroceryDeals = unstable_cache(
  async () => {
    const deals = await getDeals();

    return deals.filter(
      (deal) => deal.category.trim().toLowerCase() === "grocery",
    );
  },
  ["public-grocery-deals"],
  {
    revalidate: 1800,
    tags: ["grocery-deals"],
  },
);

export default async function GroceryDealsPage() {
  const groceryDeals = await getCachedGroceryDeals();

  return (
    <DealsApp
      initialDeals={groceryDeals}
      initialCategory="Grocery"
    />
  );
}
