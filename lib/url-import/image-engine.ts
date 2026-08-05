import * as cheerio from "cheerio";
import { assertSafePublicUrl } from "./url-security";

export interface ImageCandidate {
  url: string;
  source: string;
  priority: number;
}

export interface ImageAttempt {
  url: string;
  source: string;
  status: "selected" | "rejected";
  reason: string;
  httpStatus?: number;
  contentType?: string;
  contentLength?: number;
}

export interface ImageSelectionResult {
  imageUrl: string;
  attempts: ImageAttempt[];
  candidateCount: number;
}

const PLACEHOLDER_PATTERN = /(?:placeholder|no[-_ ]?image|default[-_ ]?image|logo|sprite|favicon|icon|avatar|loader|spinner|blank)/i;
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i;

function normalizeCandidate(raw: string, baseUrl: URL): string {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return "";
  try {
    const resolved = value.startsWith("//") ? new URL(`${baseUrl.protocol}${value}`) : new URL(value, baseUrl);
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return "";
  }
}

function pickLargestSrcset(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s+(\d+(?:\.\d+)?)(w|x)$/i);
      return { url: (match?.[1] ?? part).trim(), score: match ? Number(match[2]) : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url);
}

export function collectHtmlImageCandidates(html: string, baseUrl: URL): ImageCandidate[] {
  const $ = cheerio.load(html);
  const candidates: ImageCandidate[] = [];
  const add = (raw: string | undefined, source: string, priority: number) => {
    if (!raw) return;
    const values = source.includes("srcset") ? pickLargestSrcset(raw) : [raw];
    values.forEach((value, index) => {
      const url = normalizeCandidate(value, baseUrl);
      if (url) candidates.push({ url, source, priority: priority - index });
    });
  };

  add($('meta[property="og:image:secure_url"]').attr("content"), "open-graph-secure", 120);
  add($('meta[property="og:image"]').attr("content"), "open-graph", 115);
  add($('meta[name="twitter:image"]').attr("content"), "twitter-card", 110);
  add($('link[rel="image_src"]').attr("href"), "image-src-link", 105);

  $("img").each((_index, node) => {
    const element = $(node);
    const context = `${element.attr("alt") ?? ""} ${element.attr("class") ?? ""} ${element.attr("id") ?? ""}`;
    const productBonus = /product|gallery|main|hero|pdp/i.test(context) ? 20 : 0;
    add(element.attr("data-zoom-image"), "img:data-zoom-image", 100 + productBonus);
    add(element.attr("data-original"), "img:data-original", 95 + productBonus);
    add(element.attr("data-src"), "img:data-src", 90 + productBonus);
    add(element.attr("data-lazy-src"), "img:data-lazy-src", 88 + productBonus);
    add(element.attr("data-lazy"), "img:data-lazy", 86 + productBonus);
    add(element.attr("srcset"), "img:srcset", 84 + productBonus);
    add(element.attr("data-srcset"), "img:data-srcset", 82 + productBonus);
    add(element.attr("src"), "img:src", 75 + productBonus);
  });

  $('[style*="background-image"]').each((_index, node) => {
    const style = $(node).attr("style") ?? "";
    const matches = [...style.matchAll(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/gi)];
    matches.forEach((match) => add(match[2], "css-background-image", 65));
  });

  return dedupeCandidates(candidates);
}

export function dedupeCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  const best = new Map<string, ImageCandidate>();
  for (const candidate of candidates) {
    const existing = best.get(candidate.url);
    if (!existing || candidate.priority > existing.priority) best.set(candidate.url, candidate);
  }
  return [...best.values()].sort((a, b) => b.priority - a.priority);
}

async function fetchImageWithRedirects(rawUrl: string, signal: AbortSignal | undefined, redirectCount = 0): Promise<{ response: Response; finalUrl: URL }> {
  if (redirectCount > 5) throw new Error("TOO_MANY_REDIRECTS");
  const safeUrl = await assertSafePublicUrl(rawUrl);
  const response = await fetch(safeUrl, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(12_000)]),
    headers: {
      Range: "bytes=0-131071",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      Referer: new URL(rawUrl).origin + "/",
    },
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("REDIRECT_WITHOUT_LOCATION");
    const redirected = new URL(location, safeUrl).toString();
    await assertSafePublicUrl(redirected);
    return fetchImageWithRedirects(redirected, signal, redirectCount + 1);
  }
  return { response, finalUrl: safeUrl };
}

function rejectionReason(response: Response, contentType: string, contentLength: number): string | undefined {
  if (response.status === 401 || response.status === 403) return `blocked by source (${response.status})`;
  if (!response.ok && response.status !== 206) return `HTTP ${response.status}`;
  if (!contentType.startsWith("image/")) return `unexpected content type ${contentType || "unknown"}`;
  if (contentLength > 0 && contentLength < 2_000) return `image payload too small (${contentLength} bytes)`;
  return undefined;
}

export async function selectRequiredImage(
  candidates: ImageCandidate[],
  signal?: AbortSignal,
): Promise<ImageSelectionResult> {
  const attempts: ImageAttempt[] = [];
  const ordered = dedupeCandidates(candidates).filter((candidate) => !PLACEHOLDER_PATTERN.test(candidate.url));

  for (const candidate of ordered) {
    try {
      const { response, finalUrl } = await fetchImageWithRedirects(candidate.url, signal);
      const contentType = (response.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      const reason = rejectionReason(response, contentType, contentLength);
      if (reason) {
        attempts.push({ url: candidate.url, source: candidate.source, status: "rejected", reason, httpStatus: response.status, contentType, contentLength });
        continue;
      }
      attempts.push({ url: finalUrl.toString(), source: candidate.source, status: "selected", reason: "valid remote image", httpStatus: response.status, contentType, contentLength });
      return { imageUrl: finalUrl.toString(), attempts, candidateCount: ordered.length };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "image validation failed";
      attempts.push({ url: candidate.url, source: candidate.source, status: "rejected", reason });
    }
  }

  const fallback = ordered.find((candidate) => IMAGE_EXTENSION_PATTERN.test(candidate.url));
  if (fallback && attempts.every((attempt) => /blocked by source \(403\)|FETCH_TIMEOUT|fetch failed|AbortError/i.test(attempt.reason))) {
    attempts.push({ url: fallback.url, source: fallback.source, status: "selected", reason: "accepted verified image URL after source blocked validation" });
    return { imageUrl: fallback.url, attempts, candidateCount: ordered.length };
  }

  const error = new Error(ordered.length ? "PRODUCT_IMAGE_INVALID" : "PRODUCT_IMAGE_NOT_FOUND");
  Object.assign(error, { imageAttempts: attempts, imageCandidateCount: ordered.length });
  throw error;
}
