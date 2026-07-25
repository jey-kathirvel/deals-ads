export const AMAZON_ASSOCIATE_TAG = "adsaideals-21";

const AMAZON_HOST_PATTERN =
  /(^|\.)(amazon\.(in|com|ae|sg|co\.uk)|amzn\.in|amzn\.to)$/i;

export function isAmazonUrl(value: string): boolean {
  try {
    const normalized = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;

    return AMAZON_HOST_PATTERN.test(
      new URL(normalized).hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}

export function withAmazonAssociateTag(
  value: string,
  platform = "",
): string {
  const original = value?.trim();

  if (!original) {
    return original;
  }

  const platformIsAmazon =
    platform.toLowerCase().includes("amazon");

  try {
    const normalized = /^https?:\/\//i.test(original)
      ? original
      : `https://${original}`;

    const url = new URL(normalized);

    const hostIsAmazon =
      AMAZON_HOST_PATTERN.test(
        url.hostname.toLowerCase(),
      );

    if (!hostIsAmazon && !platformIsAmazon) {
      return original;
    }

    url.searchParams.set(
      "tag",
      AMAZON_ASSOCIATE_TAG,
    );

    return url.toString();
  } catch {
    if (!platformIsAmazon) {
      return original;
    }

    const separator = original.includes("?") ? "&" : "?";

    return `${original}${separator}tag=${AMAZON_ASSOCIATE_TAG}`;
  }
}
