import { load } from "cheerio";

export interface PreviewMetadata {
  title: string;
  description: string | null;
  imageUrl: string | null;
  authorName: string | null;
  providerName: string;
  canonicalUrl: string;
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 2_000) : null;
}

function publicUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseHtmlMetadata(html: string, pageUrl: string): PreviewMetadata {
  const $ = load(html);
  const meta = (selector: string) => clean($(selector).first().attr("content"));
  const title =
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    clean($("title").first().text()) ??
    "Saved web page";
  const canonicalUrl =
    publicUrl($("link[rel='canonical']").first().attr("href"), pageUrl) ?? pageUrl;

  return {
    title: title.slice(0, 240),
    description:
      meta('meta[property="og:description"]') ??
      meta('meta[name="twitter:description"]') ??
      meta('meta[name="description"]'),
    imageUrl:
      publicUrl(meta('meta[property="og:image:secure_url"]'), pageUrl) ??
      publicUrl(meta('meta[property="og:image"]'), pageUrl) ??
      publicUrl(meta('meta[name="twitter:image"]'), pageUrl),
    authorName:
      meta('meta[name="author"]') ??
      meta('meta[property="article:author"]'),
    providerName:
      meta('meta[property="og:site_name"]') ?? new URL(pageUrl).hostname.replace(/^www\./, ""),
    canonicalUrl
  };
}

export function parseOEmbedMetadata(
  value: Record<string, unknown>,
  sourceUrl: string
): PreviewMetadata {
  const htmlText = typeof value.html === "string" ? clean(load(value.html).text()) : null;
  return {
    title: clean(value.title as string | undefined) ?? htmlText?.slice(0, 240) ?? "Saved post",
    description: null,
    imageUrl: publicUrl(value.thumbnail_url as string | undefined, sourceUrl),
    authorName: clean(value.author_name as string | undefined),
    providerName: clean(value.provider_name as string | undefined) ?? new URL(sourceUrl).hostname,
    canonicalUrl: sourceUrl
  };
}

export function restrictedSourceFallback(
  sourceUrl: string,
  source: "x" | "instagram"
): PreviewMetadata {
  return {
    title: source === "x" ? "Saved post from X" : "Saved Instagram post",
    description: null,
    imageUrl: null,
    authorName: null,
    providerName: source === "x" ? "X / Twitter" : "Instagram",
    canonicalUrl: sourceUrl
  };
}
