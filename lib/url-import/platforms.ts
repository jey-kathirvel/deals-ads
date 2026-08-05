import type { SupportedPlatform } from "./types";

const PLATFORM_HOSTS: Array<[RegExp, SupportedPlatform]> = [
  [/(^|\.)zepto\.com$/i, "Zepto"],
  [/(^|\.)blinkit\.com$/i, "Blinkit"],
  [/(^|\.)swiggy\.com$/i, "Swiggy Instamart"],
  [/(^|\.)bigbasket\.com$/i, "BigBasket"],
  [/(^|\.)jiomart\.com$/i, "JioMart"],
  [/(^|\.)amazon\.in$/i, "Amazon"],
  [/(^|\.)flipkart\.com$/i, "Flipkart"],
  [/(^|\.)myntra\.com$/i, "Myntra"],
  [/(^|\.)ajio\.com$/i, "Ajio"],
  [/(^|\.)croma\.com$/i, "Croma"],
  [/(^|\.)reliancedigital\.in$/i, "Reliance Digital"],
  [/(^|\.)meesho\.com$/i, "Meesho"],
];

export function detectPlatform(url: URL): SupportedPlatform {
  return PLATFORM_HOSTS.find(([pattern]) => pattern.test(url.hostname))?.[1] ?? "Generic";
}

export function canonicalProductUrl(url: URL) {
  const copy = new URL(url.toString());
  copy.hash = "";
  const removable = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "tag", "affid", "affExtParam1", "affExtParam2"];
  for (const key of removable) copy.searchParams.delete(key);
  copy.hostname = copy.hostname.toLowerCase().replace(/^www\./, "");
  copy.pathname = copy.pathname.replace(/\/+$/, "") || "/";
  const entries = [...copy.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  copy.search = "";
  for (const [key, value] of entries) copy.searchParams.append(key, value);
  return copy.toString();
}
