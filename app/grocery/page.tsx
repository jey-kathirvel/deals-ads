import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import DealsApp from "@/app/deals-app";
import { getPublishedDeals } from "@/lib/deals-store";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Grocery Deals & Quick-Commerce Offers in India",
  description:
    "Browse grocery deals and daily-essential offers from Blinkit, Zepto and BigBasket.",
  alternates: {
    canonical: "/category/grocery",
  },
};

const getCachedGroceryDeals = unstable_cache(
  async () => {
    const deals = await getPublishedDeals();

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

  return <DealsApp initialDeals={groceryDeals} initialCategory="Grocery" />;
}
