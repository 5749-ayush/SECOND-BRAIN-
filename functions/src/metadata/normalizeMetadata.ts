import { fetchPublicResource } from "./fetchPage.js";
import {
  parseHtmlMetadata,
  parseOEmbedMetadata,
  restrictedSourceFallback,
  type PreviewMetadata
} from "./providers.js";

function sourceFor(url: URL): "youtube" | "x" | "instagram" | "article" {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  if (host === "x.com" || host.endsWith("twitter.com")) return "x";
  if (host.endsWith("instagram.com")) return "instagram";
  return "article";
}

export async function retrievePreview(sourceUrl: string): Promise<PreviewMetadata> {
  const source = sourceFor(new URL(sourceUrl));
  if (source === "youtube") {
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(sourceUrl)}`;
    const resource = await fetchPublicResource(endpoint);
    return parseOEmbedMetadata(JSON.parse(resource.body) as Record<string, unknown>, sourceUrl);
  }

  if (source === "x") {
    try {
      const endpoint = `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(sourceUrl)}`;
      const resource = await fetchPublicResource(endpoint);
      return parseOEmbedMetadata(JSON.parse(resource.body) as Record<string, unknown>, sourceUrl);
    } catch {
      return restrictedSourceFallback(sourceUrl, "x");
    }
  }

  try {
    const resource = await fetchPublicResource(sourceUrl);
    if (!resource.contentType.includes("html")) {
      if (source === "instagram") return restrictedSourceFallback(sourceUrl, "instagram");
      throw new Error("The source did not return a web page.");
    }
    return parseHtmlMetadata(resource.body, resource.url);
  } catch (error) {
    if (source === "instagram") return restrictedSourceFallback(sourceUrl, "instagram");
    throw error;
  }
}
