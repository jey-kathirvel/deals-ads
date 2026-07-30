import type { Deal } from "@/lib/deal-types";
import {
  cleanupDeals,
  cleanupGroceryDeals,
  deleteDeal,
  getDeals,
  importDeals,
  markDealsChecked,
} from "@/lib/deals-store";
import {
  QuickCommerceClient,
  QuickCommerceHttpError,
  type QuickCommerceProduct,
} from "./client";

export interface QuickCommerceDailyOptions {
  limit: number;
  minimumDiscountPercent: number;
  keywords: string[];
  platforms: string[];
  latitude: number;
  longitude: number;
  pincode?: string;
  categoryScope?: string;
  cleanupScope?: "all" | "grocery";
  onProgress?: (event: {
    stage: "search" | "selection" | "import" | "validation" | "cleanup";
    message: string;
    progress?: number;
  }) => void;
}

export interface QuickCommerceDailyResult {
  discovered: number;
  eligible: number;
  imported: number;
  skipped: number;
  importErrors: string[];
  checked: number;
  validationSkipped: number;
  unsupportedPlatforms: string[];
  unsupportedSearchesSkipped: number;
  deleted: number;
  retainedOnError: number;
  providerFailures: string[];
}

const VALIDATION_FRESHNESS_MS = 72 * 60 * 60 * 1000;
const CREDIT_FAILURE_LIMIT = 3;

function platformKey(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (normalized.includes("flipkartminutes")) return "flipkartminutes";
  if (normalized.includes("blinkit")) return "blinkit";
  if (normalized.includes("bigbasket")) return "bigbasket";
  if (normalized.includes("amazon")) return "amazon";
  if (normalized.includes("flipkart")) return "flipkart";
  if (normalized.includes("zepto")) return "zepto";
  if (normalized.includes("swiggy")) return "swiggy";
  if (normalized.includes("myntra")) return "myntra";
  if (normalized.includes("nykaa")) return "nykaa";
  return normalized;
}

function isFreshlyValidated(deal: Deal, now: number): boolean {
  const checkedAt = Date.parse(deal.lastCheckedAt);
  return (
    Number.isFinite(checkedAt) && now - checkedAt < VALIDATION_FRESHNESS_MS
  );
}

function isCreditFailure(error: unknown): boolean {
  if (
    error instanceof QuickCommerceHttpError &&
    (error.status === 402 || error.status === 429)
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /\b(?:credit|credits|quota|balance|payment required|rate limit)\b/i.test(
    message,
  );
}

function isUnsupportedPlatformError(error: unknown): boolean {
  return error instanceof QuickCommerceHttpError && error.status === 422;
}

function discount(product: QuickCommerceProduct): number {
  if (
    product.mrp <= 0 ||
    product.offerPrice <= 0 ||
    product.offerPrice >= product.mrp
  ) {
    return 0;
  }
  return Math.round(((product.mrp - product.offerPrice) / product.mrp) * 100);
}

/**
 * Detects genuine mobile-phone products from the product title.
 *
 * Accessories such as chargers, cables, covers, tempered glass and power
 * banks must remain in Electronics even when they were discovered through a
 * mobile-related provider search.
 */
function isMobilePhoneProduct(product: QuickCommerceProduct): boolean {
  const title = product.name
    .toLowerCase()
    .replace(/[()[\],|/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /*
   * Reject accessories and compatible products before considering brand or
   * phone-related words. A title mentioning iPhone, Galaxy, OnePlus or
   * smartphone compatibility is not necessarily a mobile phone.
   */
  const accessoryPattern =
    /\b(?:accessor(?:y|ies)|adapter|back cover|battery|cable|case|charger|charging|connector|cover|earbuds?|glass|headphones?|headsets?|holder|keyboard|lightning|mount|mouse|neckband|power bank|protector|remote|replacement|screen guard|screen protector|skin|stand|tempered|tv remote|wall charger|wireless keyboard)\b/;

  const compatibilityPattern =
    /\b(?:compatible|compatibility|designed for|for iphone|for samsung|for galaxy|for oneplus|for realme|for redmi|for vivo|for oppo|for poco|for smartphone|works with)\b/;

  if (accessoryPattern.test(title) || compatibilityPattern.test(title)) {
    return false;
  }

  /*
   * Strong generic indicators where the product explicitly identifies itself
   * as a phone.
   */
  if (
    /\b(?:5g|4g)?\s*(?:smartphone|mobile phone|feature phone)\b/.test(title)
  ) {
    return true;
  }

  /*
   * Apple phone titles must include iPhone followed by a recognisable model
   * number or model family. This prevents generic iPhone accessories from
   * becoming mobile-phone deals.
   */
  if (
    /\biphone\s*(?:se|x|xr|xs|11|12|13|14|15|16|17)(?:\s*(?:mini|plus|pro|max|e))?\b/.test(
      title,
    )
  ) {
    return true;
  }

  /*
   * Android brands require a recognisable handset model family or model code.
   */
  const androidPhonePattern =
    /\b(?:samsung\s+galaxy\s+(?:a|f|m|s|z|note)\s*\d+|oneplus\s+(?:nord|open|\d+[a-z]?)|realme\s+(?:narzo|gt|c|p|number|\d+)[\s-]*[a-z0-9]*|redmi\s+(?:note|a|k|number|\d+)[\s-]*[a-z0-9]*|poco\s+(?:c|f|m|x)\s*\d+|vivo\s+(?:t|v|x|y)\s*\d+|oppo\s+(?:a|f|find|k|reno)\s*[a-z0-9]+|google\s+pixel\s+\d+|pixel\s+\d+|nothing\s+phone\s*\(?\d+[a-z]?\)?|motorola\s+(?:edge|razr|moto\s+[eg])\s*[a-z0-9]+|moto\s+[eg]\s*\d+|iqoo\s+(?:neo|z|\d+)\s*[a-z0-9]*|infinix\s+(?:gt|hot|note|smart|zero)\s*[a-z0-9]+|tecno\s+(?:camon|phantom|pova|spark)\s*[a-z0-9]+|lava\s+(?:agni|blaze|storm|yuva)\s*[a-z0-9]+|nokia\s+(?:c|g|x|\d+)\s*[a-z0-9]+)\b/;

  return androidPhonePattern.test(title);
}

/**
 * Determines whether a QuickCommerce result is a genuine Grocery product.
 *
 * QuickCommerce providers can return loosely-related products for broad
 * searches. For example, a "rice" search may occasionally return electronics,
 * beauty products or accessories. The isolated Grocery job must reject those
 * products before ranking and persistence.
 */
function isGenuineGroceryProduct(
  product: QuickCommerceProduct,
  keyword: string,
): boolean {
  const value = `${product.name} ${product.brand ?? ""} ${keyword}`
    .toLowerCase()
    .replace(/[()[\],|/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /*
   * Strong non-Grocery exclusions take precedence over Grocery keywords.
   */
  const excludedPattern =
    /\b(?:mobile|smartphone|iphone|android phone|samsung galaxy|oneplus|realme|redmi|vivo|oppo|poco|laptop|notebook|ultrabook|computer|desktop|monitor|keyboard|mouse|mouse pad|webcam|printer|ssd|hard disk|hard drive|router|power bank|charger|charging cable|usb cable|earbuds?|headphones?|headsets?|neckband|speaker|soundbar|smart watch|smartwatch|fitness band|fitness tracker|television|smart tv|android tv|google tv|qled|oled|led tv|remote control|tempered glass|screen protector|phone case|mobile case|back cover|laptop stand|camera|memory card|pendrive|pen drive|gaming|joystick|controller|adapter|extension board|electric iron|mixer grinder|air fryer|microwave|toaster|induction cooktop|refrigerator|washing machine|air conditioner|fan|bulb|lamp|battery|inverter|shoe|shoes|sneaker|sandals?|slippers?|shirt|t-shirt|jeans|trouser|dress|kurta|saree|handbag|wallet|lipstick|mascara|foundation|eyeliner|nail polish|makeup|face wash|moisturizer|sunscreen|serum|perfume|deodorant|shampoo|conditioner|hair colour|hair color|razor|trimmer|diaper|sanitary pad|condom|medicine|tablet|capsule|supplement|protein powder)\b/;

  if (excludedPattern.test(value)) {
    return false;
  }

  /*
   * Genuine food, beverage, dairy, produce and pantry products.
   */
  const foodPattern =
    /\b(?:grocery|rice|basmati|ponni|sona masoori|atta|wheat flour|maida|rava|sooji|semolina|dal|dhal|lentil|pulses?|toor dal|tur dal|moong dal|urad dal|chana dal|rajma|chickpea|cooking oil|sunflower oil|groundnut oil|mustard oil|olive oil|coconut oil|ghee|milk|curd|yogurt|yoghurt|butter|cheese|paneer|cream|bread|bun|rusk|cake|biscuit|cookies?|snacks?|chips|namkeen|mixture|murukku|popcorn|chocolate|candy|sweet|sweets|ice cream|juice|beverage|soft drink|soda|water bottle|mineral water|tea|coffee|sugar|salt|jaggery|honey|jam|spread|pickle|papad|masala|spice|spices|turmeric|chilli powder|chili powder|coriander powder|pepper|cumin|mustard seeds?|cardamom|clove|cinnamon|ginger|garlic|onion|potato|tomato|vegetable|vegetables|fruit|fruits|apple|banana|orange|mango|grapes?|pomegranate|watermelon|papaya|guava|lemon|lime|coconut|egg|eggs|noodles|pasta|vermicelli|oats|cornflakes|cereal|muesli|ready to eat|ready-to-eat|instant food|frozen food|sauce|ketchup|mayonnaise|vinegar|soup|flour|besan|poha|aval|idli batter|dosa batter|chapati|roti|paratha|meat|chicken|mutton|fish|seafood)\b/;

  if (foodPattern.test(value)) {
    return true;
  }

  /*
   * Household consumables commonly sold through Grocery stores.
   * Appliances and electronics have already been excluded above.
   */
  const householdEssentialsPattern =
    /\b(?:dishwash|dish wash|dishwashing|detergent|laundry liquid|washing powder|fabric conditioner|floor cleaner|toilet cleaner|bathroom cleaner|glass cleaner|surface cleaner|disinfectant|phenyl|bleach|cleaning liquid|cleaning spray|scrub pad|sponge|garbage bag|trash bag|aluminium foil|aluminum foil|cling film|tissue paper|toilet paper|paper towel|kitchen towel|napkin|matchbox|matches|mosquito coil|mosquito repellent|hand wash|handwash|soap|toothpaste|toothbrush|mouthwash)\b/;

  return householdEssentialsPattern.test(value);
}

function categoryFor(keyword: string): string {
  const normalized = keyword.toLowerCase();
  if (/beauty|skin|makeup/.test(normalized)) return "Beauty";
  if (/fashion|shoe|watch/.test(normalized)) return "Fashion";
  if (/home|kitchen|appliance/.test(normalized)) return "Home";

  if (
    /grocery|milk|curd|paneer|cheese|butter|rice|atta|flour|oil|ghee|dal|lentil|salt|sugar|tea|coffee|biscuit|cookies|snack|chips|juice|soft drink|vegetable|fruit|banana|apple|onion|tomato|potato|detergent|soap|shampoo|toothpaste|cleaner|baby/.test(
      normalized,
    )
  )
    return "Grocery";

  if (/food/.test(normalized)) return "Food";
  if (
    /mobile|smartphone|iphone|samsung|oneplus|realme|redmi|vivo|oppo|poco|tv|television|laptop|notebook|ultrabook|desktop|computer|monitor|keyboard|mouse|webcam|printer|ssd|hard disk|power bank|charger|earbud|headphone|speaker|router|electronics/.test(
      normalized,
    )
  )
    return "Electronics";
  return "Other Deals";
}

/**
 * Returns a stable, human-readable product type used to prevent one type of
 * product from dominating the daily deal selection.
 *
 * Product title matching takes precedence over the search keyword because the
 * provider may return loosely-related results for broad searches.
 */
function productTypeFor(
  product: QuickCommerceProduct,
  keyword: string,
): string {
  const value = `${product.name} ${keyword}`.toLowerCase();

  if (
    /\bsmart[\s-]?watch(?:es)?\b|\bfitness tracker\b|\bfitness band\b/.test(
      value,
    )
  )
    return "Smart Watches";

  if (/\bmilk\b/.test(value)) return "Milk";
  if (/\bcurd\b|\byogurt\b/.test(value)) return "Curd";
  if (/\bpaneer\b/.test(value)) return "Paneer";
  if (/\bcheese\b/.test(value)) return "Cheese";
  if (/\bbutter\b/.test(value)) return "Butter";

  if (/\batta\b|\bflour\b/.test(value)) return "Atta";
  if (/\brice\b/.test(value)) return "Rice";
  if (/\bdal\b|\blentil\b/.test(value)) return "Dal";
  if (/\boil\b/.test(value)) return "Cooking Oil";
  if (/\bghee\b/.test(value)) return "Ghee";

  if (/\btea\b/.test(value)) return "Tea";
  if (/\bcoffee\b/.test(value)) return "Coffee";

  if (/\bbiscuit\b|\bcookie\b/.test(value)) return "Biscuits";

  if (/\bchips\b|\bsnack\b/.test(value)) return "Snacks";

  if (/\bfruit\b|\bapple\b|\bbanana\b/.test(value)) return "Fruits";

  if (/\bvegetable\b|\bonion\b|\btomato\b|\bpotato\b/.test(value))
    return "Vegetables";

  if (/\bdetergent\b/.test(value)) return "Detergents";

  if (/\bsoap\b/.test(value)) return "Soap";

  if (/\bshampoo\b/.test(value)) return "Shampoo";

  if (/\btoothpaste\b/.test(value)) return "Toothpaste";

  if (isMobilePhoneProduct(product)) {
    return "Mobile Phones";
  }

  if (
    /\bsmart tv\b|\bandroid tv\b|\bgoogle tv\b|\btelevision\b|\bqled\b|\boled\b|\bled tv\b|\b4k tv\b|\bultra hd.*tv\b|\b\d{2,3}\s*(?:cm|inch|inches).*tv\b/.test(
      value,
    )
  )
    return "Televisions";

  if (
    /\blaptop\b|\bnotebook\b|\bultrabook\b|\bchromebook\b|\bmacbook\b|\bgalaxy book\b|\bvivobook\b|\bideapad\b|\bexpertbook\b/.test(
      value,
    )
  )
    return "Laptops";

  if (
    /\bdesktop computer\b|\bdesktop pc\b|\bdesktop cpu\b|\ball-in-one desktop\b|\bcomputer pc set\b|\bcpu set\b/.test(
      value,
    )
  )
    return "Desktop Computers";

  if (/\bmonitor\b|\bcomputer display\b|\bgaming display\b/.test(value))
    return "Monitors";

  if (/\bearbuds?\b|\btws\b|\bairpods?\b/.test(value)) return "Earbuds";

  if (/\bheadphones?\b|\bheadsets?\b|\bneckband\b/.test(value))
    return "Headphones";

  if (
    /\bbluetooth speaker\b|\bwireless speaker\b|\bsoundbar\b|\bparty speaker\b/.test(
      value,
    )
  )
    return "Speakers";

  if (/\bpower bank\b|\bportable charger\b/.test(value)) return "Power Banks";

  if (/\bcharger\b|\bcharging adapter\b|\bwall adapter\b/.test(value))
    return "Chargers";

  if (
    /\bcharging cable\b|\busb cable\b|\blightning cable\b|\btype[\s-]?c cable\b|\bcable\b/.test(
      value,
    )
  )
    return "Cables";

  if (/\bkeyboard\b/.test(value)) return "Keyboards";

  if (/\bmouse\b|\btrackball\b/.test(value)) return "Computer Mouse";

  if (/\bmouse pad\b|\bdesk mat\b/.test(value)) return "Mouse Pads";

  if (/\bwebcam\b|\bweb camera\b/.test(value)) return "Webcams";

  if (/\bprinter\b|\bmultifunction printer\b/.test(value)) return "Printers";

  if (/\bssd\b|\bsolid state drive\b/.test(value)) return "SSD Storage";

  if (/\bhard disk\b|\bhard drive\b|\bhdd\b/.test(value)) return "Hard Drives";

  if (/\bwi[\s-]?fi router\b|\bwireless router\b|\bmesh router\b/.test(value))
    return "Routers";

  if (/\btempered glass\b|\bscreen protector\b/.test(value))
    return "Screen Protectors";

  if (/\bphone case\b|\bmobile case\b|\bback cover\b/.test(value))
    return "Mobile Cases";

  if (/\blaptop stand\b|\bnotebook stand\b/.test(value)) return "Laptop Stands";

  if (/\bshoe\b|\bsneaker\b|\bsandal\b|\bslipper\b/.test(value))
    return "Footwear";

  if (
    /\bshirt\b|\bt-shirt\b|\bjeans\b|\btrouser\b|\bdress\b|\bkurta\b|\bsaree\b/.test(
      value,
    )
  )
    return "Clothing";

  if (/\bmakeup\b|\blipstick\b|\bmascara\b|\bfoundation\b/.test(value))
    return "Makeup";

  if (
    /\bskin care\b|\bskincare\b|\bface wash\b|\bmoisturizer\b|\bsunscreen\b/.test(
      value,
    )
  )
    return "Skin Care";

  if (
    /\bkitchen appliance\b|\bmixer\b|\bgrinder\b|\bair fryer\b|\bmicrowave\b|\btoaster\b/.test(
      value,
    )
  )
    return "Kitchen Appliances";

  /*
   * Unknown products are grouped by their normalized search keyword. This
   * ensures even fallback types remain subject to the same maximum-four rule.
   */
  const fallback = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return fallback || "Other Products";
}

/**
 * Returns true when the balanced product type belongs to Grocery.
 *
 * Grocery classification uses the product type already derived from the
 * provider result and discovery keyword. This keeps daily ranking deterministic
 * and prevents broad provider responses from bypassing Grocery limits.
 */
function isGroceryProductType(productType: string): boolean {
  return new Set([
    "Milk",
    "Curd",
    "Paneer",
    "Cheese",
    "Butter",
    "Atta",
    "Rice",
    "Dal",
    "Cooking Oil",
    "Ghee",
    "Tea",
    "Coffee",
    "Biscuits",
    "Snacks",
    "Fruits",
    "Vegetables",
    "Detergents",
    "Soap",
    "Shampoo",
    "Toothpaste",
  ]).has(productType);
}

function key(product: QuickCommerceProduct): string {
  return `${product.platform.toLowerCase()}|${product.id.toLowerCase()}`;
}

function publicationIdentity(product: QuickCommerceProduct): {
  url: string;
  title: string;
} {
  let url = product.deeplink.toLowerCase();
  try {
    const parsed = new URL(product.deeplink);
    url = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    // The deal validator rejects malformed URLs before persistence.
  }
  return {
    url,
    title: `${product.platform.toLowerCase()}|${product.name
      .toLowerCase()
      .replace(/\W/g, "")}`,
  };
}

function publicCategoryFor(
  product: QuickCommerceProduct,
  detectedCategory: string,
  productType: string,
): string {
  if (productType === "Mobile Phones" && isMobilePhoneProduct(product)) {
    return "Mobiles";
  }

  return detectedCategory;
}

function toRow(
  product: QuickCommerceProduct,
  category: string,
  productType: string,
): Record<string, string> {
  const saving = discount(product);
  const publicCategory = publicCategoryFor(product, category, productType);
  return {
    title: product.name,
    platform: product.platform,
    category: publicCategory,
    price: String(product.offerPrice),
    mrp: String(product.mrp),
    rating: String(product.rating),
    votes: String(product.ratingCount),
    tag: `${saving}% OFF`,
    imageUrl: product.images[0] ?? "",
    expires: "Availability checked daily",
    url: product.deeplink,
    sourceUrl: product.deeplink,
    providerItemId: product.id,
    providerPlatform: product.platform,
  };
}

function validationIdentity(
  deal: Deal,
): { itemId: string; platform: string } | null {
  if (deal.source !== "quickcommerce") return null;
  if (!deal.providerItemId || !deal.providerPlatform) return null;
  return { itemId: deal.providerItemId, platform: deal.providerPlatform };
}

export class QuickCommerceDailyDealsService {
  constructor(private readonly client: QuickCommerceClient) {}

  async run(
    options: QuickCommerceDailyOptions,
  ): Promise<QuickCommerceDailyResult> {
    const candidates = new Map<
      string,
      {
        product: QuickCommerceProduct;
        category: string;
        productType: string;
      }
    >();
    const providerFailures: string[] = [];
    let rejectedNonGrocery = 0;
    const totalSearches = options.keywords.length * options.platforms.length;
    let completedSearches = 0;
    let consecutiveSearchCreditFailures = 0;
    const unsupportedPlatforms = new Map<string, string>();
    let unsupportedSearchesSkipped = 0;

    searchLoop: for (const keyword of options.keywords) {
      for (const platform of options.platforms) {
        if (unsupportedPlatforms.has(platformKey(platform))) {
          unsupportedSearchesSkipped += 1;
          completedSearches += 1;
          continue;
        }

        options.onProgress?.({
          stage: "search",
          message: `Searching ${platform} for "${keyword}".`,
          progress:
            totalSearches > 0
              ? 25 + Math.round((completedSearches / totalSearches) * 35)
              : 25,
        });
        try {
          const products = await this.client.search({
            query: keyword,
            platform,
            latitude: options.latitude,
            longitude: options.longitude,
            pincode: options.pincode,
          });
          consecutiveSearchCreditFailures = 0;
          for (const product of products) {
            const productType = productTypeFor(product, keyword);

            /*
             * Genuine mobile phones often have smaller percentage discounts
             * than accessories. Permit them from 1% while preserving the
             * configured minimum discount for every other product type.
             */
            const requiredDiscount =
              productType === "Mobile Phones"
                ? Math.min(options.minimumDiscountPercent, 1)
                : isGroceryProductType(productType)
                  ? Math.min(options.minimumDiscountPercent, 5)
                  : options.minimumDiscountPercent;

            const groceryScope =
              options.categoryScope?.trim().toLowerCase() === "grocery";

            const genuineGrocery =
              !groceryScope || isGenuineGroceryProduct(product, keyword);

            if (groceryScope && !genuineGrocery) {
              rejectedNonGrocery += 1;
            }

            if (
              genuineGrocery &&
              product.available &&
              product.images.length > 0 &&
              product.offerPrice > 0 &&
              discount(product) >= requiredDiscount
            ) {
              candidates.set(key(product), {
                product,

                /*
                 * Every product discovered by the isolated Grocery job must
                 * be published under the Grocery category. Without this
                 * override, searches such as rice, dal, fruits and vegetables
                 * are classified as Other Deals and do not appear on
                 * /grocery.
                 */
                category: options.categoryScope?.trim() || categoryFor(keyword),

                productType,
              });
            }
          }
          options.onProgress?.({
            stage: "search",
            message: `${platform} / "${keyword}": ${products.length} results received; ${candidates.size} unique eligible candidates so far.`,
          });
        } catch (error) {
          const failure = `${platform}/${keyword}: ${
            error instanceof Error ? error.message : String(error)
          }`;

          if (isUnsupportedPlatformError(error)) {
            unsupportedPlatforms.set(platformKey(platform), platform);
            consecutiveSearchCreditFailures = 0;
            options.onProgress?.({
              stage: "search",
              message: `${platform} returned HTTP 422 and is unsupported for this search. It has been disabled for the remainder of this job.`,
            });
          } else {
            providerFailures.push(failure);
            options.onProgress?.({
              stage: "search",
              message: `Provider error for ${failure}`,
            });
          }

          if (!isUnsupportedPlatformError(error) && isCreditFailure(error)) {
            consecutiveSearchCreditFailures += 1;
            if (consecutiveSearchCreditFailures >= CREDIT_FAILURE_LIMIT) {
              const stoppedMessage =
                "Search stopped after 3 consecutive credit, quota or rate-limit errors to protect the remaining API credits.";
              providerFailures.push(stoppedMessage);
              options.onProgress?.({
                stage: "search",
                message: stoppedMessage,
              });
              break searchLoop;
            }
          } else if (!isUnsupportedPlatformError(error)) {
            consecutiveSearchCreditFailures = 0;
          }
        } finally {
          completedSearches += 1;
        }
      }
    }

    const existing = await getDeals(true);

    const scopedExisting = options.categoryScope
      ? existing.filter(
          (deal) =>
            deal.category.trim().toLowerCase() ===
            options.categoryScope?.trim().toLowerCase(),
        )
      : existing;

    const selectedPlatforms = new Set(options.platforms.map(platformKey));
    const now = Date.now();
    const selectedPlatformDeals = scopedExisting.filter((deal) =>
      selectedPlatforms.has(
        platformKey(deal.providerPlatform?.trim() || deal.platform),
      ),
    );
    const validationDeals = selectedPlatformDeals.filter(
      (deal) => !isFreshlyValidated(deal, now),
    );
    const validationSkipped =
      selectedPlatformDeals.length - validationDeals.length;

    const publicationUrls = new Set<string>();
    const publicationTitles = new Set<string>();
    for (const deal of scopedExisting) {
      const identity = publicationIdentity({
        id: String(deal.id),
        name: deal.title,
        brand: "",
        available: deal.active,
        images: deal.imageUrl ? [deal.imageUrl] : [],
        mrp: deal.mrp,
        offerPrice: deal.price,
        deeplink: deal.url,
        rating: deal.rating,
        ratingCount: deal.votes,
        inventory: null,
        rank: 0,
        platform: deal.platform,
      });
      publicationUrls.add(identity.url);
      publicationTitles.add(identity.title);
    }

    const rankedCandidates = [...candidates.values()].sort((left, right) => {
      /*
       * Genuine mobile phones are intentionally considered first so they are
       * not pushed outside the global daily import limit by accessories.
       */
      const mobilePhoneDifference =
        Number(right.productType === "Mobile Phones") -
        Number(left.productType === "Mobile Phones");

      if (mobilePhoneDifference !== 0) {
        return mobilePhoneDifference;
      }

      /*
       * Grocery is considered before general Electronics so Grocery products
       * are not pushed outside the global daily limit. Product-type balancing
       * still prevents any single Grocery type from dominating the selection.
       */
      const groceryDifference =
        Number(right.category === "Grocery") -
        Number(left.category === "Grocery");

      if (groceryDifference !== 0) {
        return groceryDifference;
      }

      /*
       * Electronics are then prioritised so television and computer results
       * are not pushed outside the global daily import limit.
       */
      const categoryDifference =
        Number(right.category === "Electronics") -
        Number(left.category === "Electronics");

      if (categoryDifference !== 0) return categoryDifference;

      const discountDifference =
        discount(right.product) - discount(left.product);
      if (discountDifference !== 0) return discountDifference;
      const ratingDifference = right.product.rating - left.product.rating;
      if (ratingDifference !== 0) return ratingDifference;
      const ratingCountDifference =
        right.product.ratingCount - left.product.ratingCount;
      if (ratingCountDifference !== 0) return ratingCountDifference;

      const priceDifference =
        left.product.offerPrice - right.product.offerPrice;
      if (priceDifference !== 0) return priceDifference;

      return key(left.product).localeCompare(key(right.product));
    });

    const maximumPerProductType = 4;
    const finalLimit = Math.max(1, Math.min(50, options.limit));
    const productTypeCounts = new Map<string, number>();
    const ranked: typeof rankedCandidates = [];

    for (const candidate of rankedCandidates) {
      const identity = publicationIdentity(candidate.product);

      if (
        publicationUrls.has(identity.url) ||
        publicationTitles.has(identity.title)
      ) {
        continue;
      }

      const currentTypeCount =
        productTypeCounts.get(candidate.productType) ?? 0;

      /*
       * Never import more than four deals of the same product type during one
       * run. Because candidates are already ranked, the retained four are the
       * best deals by discount, rating, review count and offer price.
       */
      if (currentTypeCount >= maximumPerProductType) {
        continue;
      }

      publicationUrls.add(identity.url);
      publicationTitles.add(identity.title);

      productTypeCounts.set(candidate.productType, currentTypeCount + 1);

      ranked.push(candidate);

      if (ranked.length >= finalLimit) {
        break;
      }
    }

    console.info(
      "[QuickCommerce] Balanced product-type selection",
      JSON.stringify({
        discovered: candidates.size,
        rejectedNonGrocery,
        selected: ranked.length,
        finalLimit,
        maximumPerProductType,
        candidateProductTypes: Object.fromEntries(
          [
            ...rankedCandidates
              .reduce((counts, candidate) => {
                counts.set(
                  candidate.productType,
                  (counts.get(candidate.productType) ?? 0) + 1,
                );
                return counts;
              }, new Map<string, number>())
              .entries(),
          ].sort((left, right) => left[0].localeCompare(right[0])),
        ),
        productTypes: Object.fromEntries(
          [...productTypeCounts.entries()].sort((left, right) =>
            left[0].localeCompare(right[0]),
          ),
        ),
      }),
    );

    options.onProgress?.({
      stage: "selection",
      message: `Selected ${ranked.length} deals from ${candidates.size} eligible candidates. ${rejectedNonGrocery} non-grocery results rejected. ${unsupportedPlatforms.size} unsupported platforms disabled and ${unsupportedSearchesSkipped} repeated searches avoided.`,
      progress: 65,
    });
    options.onProgress?.({
      stage: "import",
      message: `Importing ${ranked.length} selected deals.`,
      progress: 70,
    });

    const importResult = await importDeals(
      ranked.map(({ product, category, productType }) =>
        toRow(product, category, productType),
      ),
      { publish: true, source: "quickcommerce" },
    );

    options.onProgress?.({
      stage: "import",
      message: `Import completed: ${importResult.imported} added, ${importResult.skipped} skipped, ${importResult.errors.length} failed.`,
      progress: 78,
    });

    let checked = 0;
    let deleted = 0;
    let retainedOnError = 0;
    let consecutiveValidationCreditFailures = 0;
    const successfullyCheckedIds: number[] = [];
    options.onProgress?.({
      stage: "validation",
      message: `Validating ${validationDeals.length} due deals from the selected platforms; ${validationSkipped} skipped because they were checked within 72 hours.`,
      progress: 80,
    });
    for (const deal of validationDeals) {
      const identity = validationIdentity(deal);
      if (!identity) continue;
      checked += 1;
      try {
        const current = await this.client.item({
          ...identity,
          latitude: options.latitude,
          longitude: options.longitude,
          pincode: options.pincode,
        });
        consecutiveValidationCreditFailures = 0;
        if (current && (!current.available || current.offerPrice <= 0)) {
          await deleteDeal(deal.id);
          deleted += 1;
        } else if (current) {
          successfullyCheckedIds.push(deal.id);
        }
      } catch (error) {
        /*
         * A missing item or temporary provider error is not sufficient proof
         * that an existing deal is inactive. Keep the deal unless the provider
         * explicitly returns it as unavailable or invalid.
         */
        retainedOnError += 1;
        if (isCreditFailure(error)) {
          consecutiveValidationCreditFailures += 1;
          if (consecutiveValidationCreditFailures >= CREDIT_FAILURE_LIMIT) {
            const stoppedMessage =
              "Validation stopped after 3 consecutive credit, quota or rate-limit errors; unvalidated deals were retained.";
            providerFailures.push(stoppedMessage);
            options.onProgress?.({
              stage: "validation",
              message: stoppedMessage,
            });
            break;
          }
        } else {
          consecutiveValidationCreditFailures = 0;
        }
      }

      if (checked === validationDeals.length || checked % 10 === 0) {
        options.onProgress?.({
          stage: "validation",
          message: `Validated ${checked} of ${validationDeals.length} due deals; ${deleted} deleted and ${retainedOnError} retained after provider errors.`,
          progress:
            validationDeals.length > 0
              ? 80 + Math.round((checked / validationDeals.length) * 12)
              : 92,
        });
      }
    }
    await markDealsChecked(successfullyCheckedIds);

    /*
     * Hard-delete only deals already confirmed as expired or inactive.
     * Active deals are retained even when absent from the latest search result.
     */
    options.onProgress?.({
      stage: "cleanup",
      message:
        options.cleanupScope === "grocery"
          ? "Hard-deleting confirmed inactive or expired Grocery deals."
          : "Hard-deleting confirmed inactive or expired published deals.",
      progress: 94,
    });

    const lifecycleResult =
      options.cleanupScope === "grocery"
        ? await cleanupGroceryDeals()
        : await cleanupDeals();

    deleted += lifecycleResult.deletedUnsavedDeals;
    options.onProgress?.({
      stage: "cleanup",
      message: `Cleanup completed. ${lifecycleResult.deletedUnsavedDeals} stale deals permanently deleted.`,
      progress: 98,
    });

    return {
      discovered: candidates.size,
      eligible: ranked.length,
      imported: importResult.imported,
      skipped: importResult.skipped,
      importErrors: importResult.errors,
      checked,
      validationSkipped,
      unsupportedPlatforms: [...unsupportedPlatforms.values()],
      unsupportedSearchesSkipped,
      deleted,
      retainedOnError,
      providerFailures,
    };
  }
}

export function quickCommerceOptionsFromEnvironment(): QuickCommerceDailyOptions {
  const split = (value: string | undefined, fallback: string[]) =>
    (value?.split(",") ?? fallback).map((item) => item.trim()).filter(Boolean);
  return {
    limit: Number(process.env.QUICKCOMMERCE_DAILY_LIMIT ?? "50"),
    minimumDiscountPercent: Number(
      process.env.QUICKCOMMERCE_MINIMUM_DISCOUNT ?? "10",
    ),

    keywords: Array.from(
      new Set([
        ...split(process.env.QUICKCOMMERCE_KEYWORDS, []),

        // Existing/default searches
        "headphones",
        "smart watches",
        "kitchen appliances",
        "fashion",

        // Grocery and daily essentials
        "grocery",
        "milk",
        "curd",
        "paneer",
        "cheese",
        "butter",
        "atta",
        "wheat flour",
        "rice",
        "dal",
        "cooking oil",
        "ghee",
        "salt",
        "sugar",
        "tea",
        "coffee",
        "biscuits",
        "cookies",
        "chips",
        "snacks",
        "fruit",
        "vegetables",
        "juice",
        "soft drinks",
        "detergent",
        "soap",
        "shampoo",
        "toothpaste",

        // Mobile phones
        "mobile",
        "mobiles",
        "mobile phone",
        "smartphone",
        "smartphones",
        "iphone",
        "android phone",
        "samsung galaxy",
        "oneplus mobile",
        "realme mobile",
        "redmi mobile",
        "vivo mobile",
        "oppo mobile",
        "poco mobile",

        // Televisions
        "tv",
        "television",
        "smart tv",
        "android tv",
        "google tv",
        "led tv",
        "qled tv",
        "oled tv",
        "4k tv",

        // Computers and laptops
        "laptop",
        "laptops",
        "gaming laptop",
        "business laptop",
        "ultrabook",
        "notebook computer",
        "desktop computer",
        "computer",
        "monitor",
        "gaming monitor",

        // Computer and mobile accessories
        "keyboard",
        "computer mouse",
        "webcam",
        "printer",
        "ssd",
        "external hard disk",
        "power bank",
        "mobile charger",
        "earbuds",
        "bluetooth speaker",
        "wifi router",
      ]),
    ),

    platforms: split(process.env.QUICKCOMMERCE_PLATFORMS, [
      "Amazon",
      "Flipkart",
      "Myntra",
      "Nykaa",
      "BlinkIt",
      "Zepto",
      "Flipkart Minutes",
    ]),
    latitude: Number(process.env.QUICKCOMMERCE_LATITUDE ?? "12.9716"),
    longitude: Number(process.env.QUICKCOMMERCE_LONGITUDE ?? "77.5946"),
    pincode: process.env.QUICKCOMMERCE_PINCODE?.trim() || undefined,
  };
}

export function quickCommerceGroceryOptionsFromEnvironment(): QuickCommerceDailyOptions {
  const split = (value: string | undefined, fallback: string[]) =>
    (value?.split(",") ?? fallback).map((item) => item.trim()).filter(Boolean);

  const configuredLimit = Number(process.env.GROCERY_DAILY_LIMIT ?? "20");

  return {
    /*
     * A successful Grocery run must request at least twenty deals.
     * The service may import fewer only when the provider itself returns
     * fewer eligible products.
     */
    limit: Math.max(
      20,
      Math.min(50, Number.isFinite(configuredLimit) ? configuredLimit : 20),
    ),

    minimumDiscountPercent: Number(process.env.GROCERY_MINIMUM_DISCOUNT ?? "1"),

    keywords: Array.from(
      new Set(
        split(process.env.GROCERY_KEYWORDS, [
          "grocery",
          "rice",
          "atta",
          "dal",
          "cooking oil",
          "milk",
          "curd",
          "bread",
          "eggs",
          "fruits",
          "vegetables",
          "snacks",
          "biscuits",
          "beverages",
          "tea",
          "coffee",
          "household essentials",
          "personal care",
        ]),
      ),
    ),

    platforms: split(process.env.GROCERY_PLATFORMS, [
      "BlinkIt",
      "Zepto",
      "BigBasket",
    ]),

    latitude: Number(
      process.env.GROCERY_LATITUDE ??
        process.env.QUICKCOMMERCE_LATITUDE ??
        "12.9716",
    ),

    longitude: Number(
      process.env.GROCERY_LONGITUDE ??
        process.env.QUICKCOMMERCE_LONGITUDE ??
        "77.5946",
    ),

    pincode:
      process.env.GROCERY_PINCODE?.trim() ||
      process.env.QUICKCOMMERCE_PINCODE?.trim() ||
      undefined,

    categoryScope: "Grocery",
    cleanupScope: "grocery",
  };
}
