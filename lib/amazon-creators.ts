type AmazonCsvItem = {
  title: string; platform: string; category: string; price: number; mrp: number;
  url: string; imageUrl: string; tag: string; code: string; couponTerms: string;
  expires: string; expiryDate: string; rating: string; votes: string; asin: string;
  source: string; lastCheckedAt: string;
};

const searches = [
  ["smartphones", "Mobiles"], ["electronics", "Electronics"], ["home appliances", "Home"],
  ["fashion", "Fashion"], ["beauty", "Beauty"], ["headphones", "Electronics"],
  ["laptops", "Electronics"], ["kitchen", "Home"],
] as const;

export function amazonConfig() {
  const required = ["AMAZON_CREATORS_CREDENTIAL_ID","AMAZON_CREATORS_CREDENTIAL_SECRET","AMAZON_CREATORS_CREDENTIAL_VERSION","AMAZON_PARTNER_TAG"] as const;
  const missing = required.filter((key) => !process.env[key]);
  return { ready: missing.length === 0, missing, marketplace: "www.amazon.in", api: "Amazon Creators API" };
}

export async function fetchAmazonDeals(options: { count?: number; minSavingPercent?: number } = {}) {
  const config = amazonConfig();
  if (!config.ready) throw new Error(`Amazon Creators API credentials required: ${config.missing.join(", ")}`);
  const count = Math.min(50, Math.max(1, Number(options.count || 50)));
  const minSavingPercent = Math.min(90, Math.max(1, Number(options.minSavingPercent || 20)));
  const token = await getToken();
  const items: AmazonCsvItem[] = []; const seen = new Set<string>();
  for (const [keywords, category] of searches) {
    if (items.length >= count) break;
    const response = await fetch("https://creatorsapi.amazon/catalog/v1/searchItems", {
      method: "POST",
      headers: {
        "Authorization": authHeader(token),
        "Content-Type": "application/json",
        "x-marketplace": "www.amazon.in",
      },
      body: JSON.stringify({
        keywords, searchIndex: "All", marketplace: "www.amazon.in",
        partnerTag: process.env.AMAZON_PARTNER_TAG, itemCount: 10,
        minSavingPercent,
        resources: ["images.primary.medium","itemInfo.title","offersV2.listings.price","offersV2.listings.dealDetails","offersV2.listings.availability"],
      }),
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(apiError(payload, response.status));
    for (const item of payload.searchResult?.items || []) {
      if (!item.asin || seen.has(item.asin)) continue;
      const listing = item.offersV2?.listings?.[0];
      const price = Number(listing?.price?.money?.amount || 0);
      const mrp = Number(listing?.price?.savingBasis?.money?.amount || listing?.savingBasis?.money?.amount || 0);
      if (!price || !mrp || price >= mrp) continue;
      const endTime = listing?.dealDetails?.endTime || "";
      items.push({
        title: item.itemInfo?.title?.displayValue || item.asin, platform: "Amazon", category,
        price, mrp, url: item.detailPageURL || `https://www.amazon.in/dp/${item.asin}`,
        imageUrl: item.images?.primary?.medium?.url || "", tag: listing?.dealDetails?.badge || "Amazon deal",
        code: "", couponTerms: listing?.dealDetails?.accessType === "PRIME_EXCLUSIVE" ? "Prime members only" : "",
        expires: endTime ? "Limited-time deal" : "While stocks last", expiryDate: endTime ? endTime.slice(0,10) : "",
        rating: "", votes: "", asin: item.asin, source: "amazon", lastCheckedAt: new Date().toISOString(),
      });
      seen.add(item.asin); if (items.length >= count) break;
    }
  }
  return items.sort((a,b) => (1-a.price/a.mrp)-(1-b.price/b.mrp)).reverse().slice(0,count);
}

export function amazonItemsToCsv(items: AmazonCsvItem[]) {
  const headers = ["title","platform","category","price","mrp","url","imageUrl","tag","code","couponTerms","expires","expiryDate","rating","votes","asin","source","lastCheckedAt"];
  return [headers.join(","), ...items.map((item) => headers.map((key) => csv(String(item[key as keyof AmazonCsvItem] ?? ""))).join(","))].join("\n");
}

async function getToken() {
  const version = process.env.AMAZON_CREATORS_CREDENTIAL_VERSION || "";
  const region = version.endsWith(".1") ? "na" : version.endsWith(".3") ? "fe" : "eu";
  const v3 = version.startsWith("3.");
  const endpoints = v3
    ? { na:"https://api.amazon.com/auth/o2/token", eu:"https://api.amazon.co.uk/auth/o2/token", fe:"https://api.amazon.co.jp/auth/o2/token" }
    : { na:"https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token", eu:"https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token", fe:"https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token" };
  const values = { grant_type:"client_credentials", client_id:process.env.AMAZON_CREATORS_CREDENTIAL_ID!, client_secret:process.env.AMAZON_CREATORS_CREDENTIAL_SECRET!, scope:v3?"creatorsapi::default":"creatorsapi/default" };
  const response = await fetch(endpoints[region], {
    method:"POST", headers:{"Content-Type":v3?"application/json":"application/x-www-form-urlencoded"},
    body:v3?JSON.stringify(values):new URLSearchParams(values), cache:"no-store",
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(apiError(payload,response.status));
  return payload.access_token as string;
}

function authHeader(token:string) {
  const version = process.env.AMAZON_CREATORS_CREDENTIAL_VERSION || "";
  return version.startsWith("2.") ? `Bearer ${token}, Version ${version}` : `Bearer ${token}`;
}
function apiError(payload:any,status:number) {
  return `Amazon API ${status}: ${payload?.reason || payload?.error || payload?.message || "Request failed"}`;
}
function csv(value:string) { return /[",\n]/.test(value) ? `"${value.replace(/"/g,'""')}"` : value; }
