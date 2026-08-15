import { fetchPublicResource } from "./fetchPage.js";
import {
  directImageMetadata,
  parseFxTwitterMetadata,
  parseHtmlMetadata,
  parseInstagramEmbed,
  parseOEmbedMetadata,
  restrictedSourceFallback,
  type PreviewMetadata
} from "./providers.js";

const IMAGE_EXTENSION_REGEX = /\.(?:jpe?g|png|gif|webp|svg|avif)(?:\?.*)?$/i;

function sourceFor(url: URL): "youtube" | "x" | "instagram" | "image" | "article" {
  if (IMAGE_EXTENSION_REGEX.test(url.pathname)) {
    return "image";
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  if (
    host === "x.com" ||
    host.endsWith("twitter.com") ||
    host === "fxtwitter.com" ||
    host === "vxtwitter.com" ||
    host === "fixupx.com"
  ) {
    return "x";
  }
  if (host.endsWith("instagram.com") || host === "instagr.am" || host === "ddinstagram.com") {
    return "instagram";
  }
  return "article";
}

export async function retrievePreview(sourceUrl: string): Promise<PreviewMetadata> {
  const url = new URL(sourceUrl);
  const source = sourceFor(url);

  if (source === "image") {
    return directImageMetadata(sourceUrl);
  }

  if (source === "youtube") {
    try {
      const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(sourceUrl)}`;
      const resource = await fetchPublicResource(endpoint);
      return parseOEmbedMetadata(JSON.parse(resource.body) as Record<string, unknown>, sourceUrl);
    } catch {
      return restrictedSourceFallback(sourceUrl, "youtube");
    }
  }

  if (source === "x") {
    const statusMatch = sourceUrl.match(/(?:status|statuses)\/(\d+)/i);
    const statusId = statusMatch?.[1];

    if (statusId) {
      try {
        const fxEndpoint = `https://api.fxtwitter.com/i/status/${statusId}`;
        const resource = await fetchPublicResource(fxEndpoint);
        const data = JSON.parse(resource.body) as Record<string, unknown>;
        if (data.code === 200 || data.tweet) {
          return parseFxTwitterMetadata(data, sourceUrl);
        }
      } catch {
        // Fall back to oEmbed
      }
    }

    try {
      const endpoint = `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(sourceUrl)}`;
      const resource = await fetchPublicResource(endpoint);
      const parsed = parseOEmbedMetadata(JSON.parse(resource.body) as Record<string, unknown>, sourceUrl);
      if (!parsed.imageUrl && statusId) {
        parsed.imageUrl = `https://d.fxtwitter.com/i/status/${statusId}.jpg`;
      }
      return parsed;
    } catch {
      return restrictedSourceFallback(sourceUrl, "x");
    }
  }

  if (source === "instagram") {
    const codeMatch = sourceUrl.match(/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
    const code = codeMatch?.[1];

    if (code) {
      try {
        const embedEndpoint = `https://www.instagram.com/p/${code}/embed/captioned/`;
        const resource = await fetchPublicResource(embedEndpoint);
        if (resource.contentType.includes("html") && resource.body.length > 500) {
          return parseInstagramEmbed(resource.body, sourceUrl);
        }
      } catch {
        // Fall back to restricted fallback
      }
    }

    return restrictedSourceFallback(sourceUrl, "instagram");
  }

  try {
    const resource = await fetchPublicResource(sourceUrl);
    if (resource.contentType.startsWith("image/")) {
      return directImageMetadata(sourceUrl);
    }
    if (!resource.contentType.includes("html")) {
      return restrictedSourceFallback(sourceUrl, "article");
    }
    return parseHtmlMetadata(resource.body, resource.url);
  } catch (error) {
    return restrictedSourceFallback(sourceUrl, "article");
  }
}

