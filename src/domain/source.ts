import type { SourceType } from "./idea";

const HOST_SOURCE_MAP: Record<string, SourceType> = {
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "x.com": "x",
  "mobile.x.com": "x",
  "twitter.com": "x",
  "mobile.twitter.com": "x",
  "instagram.com": "instagram"
};

export function normalizePublicUrl(value: string): string {
  const url = new URL(value.trim());

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http and https URLs are supported.");
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

export function detectSourceType(value: string): SourceType {
  const url = new URL(normalizePublicUrl(value));
  const hostname = url.hostname.replace(/^www\./, "");
  return HOST_SOURCE_MAP[hostname] ?? "article";
}
