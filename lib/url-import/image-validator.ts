import { assertSafePublicUrl } from "./url-security";

export async function validateRequiredImage(imageUrl: string, signal?: AbortSignal) {
  if (!imageUrl) throw new Error("PRODUCT_IMAGE_NOT_FOUND");
  const url = await assertSafePublicUrl(imageUrl);
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(12_000)]),
    headers: { Range: "bytes=0-65535", "User-Agent": "Mozilla/5.0 DealsAdsImporter/1.0", Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
  });
  if (response.status >= 300 && response.status < 400) throw new Error("PRODUCT_IMAGE_BLOCKED");
  if (!response.ok) throw new Error(response.status === 403 ? "PRODUCT_IMAGE_BLOCKED" : "PRODUCT_IMAGE_INVALID");
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("image/")) throw new Error("PRODUCT_IMAGE_INVALID");
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 0 && contentLength < 2_000) throw new Error("PRODUCT_IMAGE_TOO_SMALL");
  return url.toString();
}
