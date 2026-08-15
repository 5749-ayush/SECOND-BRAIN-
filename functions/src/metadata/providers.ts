import { load } from "cheerio";
import { cleanRawSocialMetadata, enforceTitleLimit } from "./aiTitling.js";

export interface PreviewMetadata {
  title: string;
  description: string | null;
  imageUrl: string | null;
  authorName: string | null;
  providerName: string;
  canonicalUrl: string;
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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

export function extractYouTubeVideoIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0]?.split("?")[0];
      return id && id.length > 0 ? id : null;
    }
    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v) return v;
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" || pathParts[0] === "embed" || pathParts[0] === "v") {
        return pathParts[1] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function extractShortHeadline(rawText: string | null | undefined, maxWords: number = 14): string {
  return enforceTitleLimit(rawText, maxWords);
}

export function parseHtmlMetadata(html: string, pageUrl: string): PreviewMetadata {
  const $ = load(html);
  const meta = (selector: string) => clean($(selector).first().attr("content"));
  const hostname = new URL(pageUrl).hostname.replace(/^www\./, "");
  const isInstagram = hostname.includes("instagram.com") || hostname === "instagr.am";

  const rawTitle =
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    clean($("title").first().text()) ??
    clean($("h1").first().text()) ??
    `Page from ${hostname}`;

  const description =
    meta('meta[property="og:description"]') ??
    meta('meta[name="twitter:description"]') ??
    meta('meta[name="description"]') ??
    meta('meta[name="summary"]') ??
    meta('meta[itemprop="description"]') ??
    clean($("article p").first().text()) ??
    clean($("main p").first().text()) ??
    clean($("p").first().text());

  const imageUrl =
    publicUrl(meta('meta[property="og:image:secure_url"]'), pageUrl) ??
    publicUrl(meta('meta[property="og:image"]'), pageUrl) ??
    publicUrl(meta('meta[name="twitter:image:src"]'), pageUrl) ??
    publicUrl(meta('meta[name="twitter:image"]'), pageUrl) ??
    publicUrl(meta('link[rel="image_src"]'), pageUrl) ??
    publicUrl(meta('meta[itemprop="image"]'), pageUrl);

  const authorMatch = rawTitle.match(/^(.+?)\s+on\s+Instagram:/i);
  const extractedAuthor = authorMatch ? authorMatch[1]?.trim() : null;

  const authorName =
    extractedAuthor ??
    meta('meta[name="author"]') ??
    meta('meta[property="article:author"]') ??
    meta('meta[name="twitter:creator"]') ??
    meta('meta[name="twitter:site"]');

  const providerName =
    meta('meta[property="og:site_name"]') ??
    meta('meta[name="application-name"]') ??
    (isInstagram ? "Instagram" : hostname);

  const canonicalUrl =
    publicUrl($("link[rel='canonical']").first().attr("href"), pageUrl) ?? pageUrl;

  const cleanTitle = extractShortHeadline(rawTitle, 14);
  const cleanDescription = description ? cleanRawSocialMetadata(description) : null;

  return {
    title: cleanTitle,
    description: cleanDescription ? cleanDescription.slice(0, 1_000) : null,
    imageUrl,
    authorName: authorName ? authorName.slice(0, 160) : null,
    providerName: providerName ? providerName.slice(0, 80) : hostname,
    canonicalUrl
  };
}

export function parseOEmbedMetadata(
  value: Record<string, unknown>,
  sourceUrl: string
): PreviewMetadata {
  const $ = typeof value.html === "string" ? load(value.html) : null;
  const tweetText = $ ? clean($("blockquote p").first().text() || $.text()) : null;
  const rawTitle = clean(value.title as string | undefined);
  const authorName = clean(value.author_name as string | undefined);
  const providerName =
    clean(value.provider_name as string | undefined) ??
    (sourceUrl.includes("twitter.com") || sourceUrl.includes("x.com")
      ? "X / Twitter"
      : new URL(sourceUrl).hostname);

  let imageUrl = publicUrl(value.thumbnail_url as string | undefined, sourceUrl);
  if (!imageUrl && (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be"))) {
    const videoId = extractYouTubeVideoIdFromUrl(sourceUrl);
    if (videoId) {
      imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  const title = extractShortHeadline(rawTitle ?? tweetText, 14);
  const cleanTweetText = tweetText ? cleanRawSocialMetadata(tweetText) : null;
  const description =
    cleanTweetText && cleanTweetText !== title
      ? cleanTweetText.slice(0, 1_000)
      : typeof value.description === "string"
      ? cleanRawSocialMetadata(clean(value.description))
      : authorName && (sourceUrl.includes("youtube") || sourceUrl.includes("youtu.be"))
      ? `YouTube video by ${authorName}`
      : null;

  return {
    title,
    description: description ? description.slice(0, 1_000) : null,
    imageUrl,
    authorName,
    providerName,
    canonicalUrl: sourceUrl
  };
}

export function parseFxTwitterMetadata(
  data: Record<string, unknown>,
  sourceUrl: string
): PreviewMetadata {
  const tweet = (data.tweet ?? data) as Record<string, unknown>;
  const author = (tweet.author ?? {}) as Record<string, unknown>;
  const authorNameStr = clean(author.name as string | undefined);
  const screenNameStr = clean(author.screen_name as string | undefined);
  const authorName =
    authorNameStr && screenNameStr
      ? `${authorNameStr} (@${screenNameStr})`
      : authorNameStr || (screenNameStr ? `@${screenNameStr}` : null);

  const text = clean(tweet.text as string | undefined) ?? "Saved post from X";
  const media = (tweet.media ?? {}) as Record<string, unknown>;
  const photos = (media.photos ?? []) as Array<Record<string, unknown>>;
  const videos = (media.videos ?? []) as Array<Record<string, unknown>>;
  const mosaic = (media.mosaic ?? {}) as Record<string, unknown>;
  const mosaicFormats = (mosaic.formats ?? {}) as Record<string, unknown>;
  const externalMedia = (media.external ?? {}) as Record<string, unknown>;
  const card = (tweet.card ?? {}) as Record<string, unknown>;
  const quote = (tweet.quote ?? {}) as Record<string, unknown>;
  const quoteMedia = (quote.media ?? {}) as Record<string, unknown>;
  const quotePhotos = (quoteMedia.photos ?? []) as Array<Record<string, unknown>>;
  const quoteVideos = (quoteMedia.videos ?? []) as Array<Record<string, unknown>>;

  const statusMatch = sourceUrl.match(/(?:status|statuses)\/(\d+)/i);
  const statusId = statusMatch?.[1];

  let imageUrl: string | null = null;
  if (photos.length > 0 && photos[0]?.url) {
    imageUrl = publicUrl(photos[0].url as string, sourceUrl);
  } else if (videos.length > 0 && videos[0]?.thumbnail_url) {
    imageUrl = publicUrl(videos[0].thumbnail_url as string, sourceUrl);
  } else if (mosaicFormats.jpeg) {
    imageUrl = publicUrl(mosaicFormats.jpeg as string, sourceUrl);
  } else if (externalMedia.thumbnail_url || externalMedia.url) {
    imageUrl = publicUrl((externalMedia.thumbnail_url ?? externalMedia.url) as string, sourceUrl);
  } else if (card.image_url || card.thumbnail_url) {
    imageUrl = publicUrl((card.image_url ?? card.thumbnail_url) as string, sourceUrl);
  } else if (quotePhotos.length > 0 && quotePhotos[0]?.url) {
    imageUrl = publicUrl(quotePhotos[0].url as string, sourceUrl);
  } else if (quoteVideos.length > 0 && quoteVideos[0]?.thumbnail_url) {
    imageUrl = publicUrl(quoteVideos[0].thumbnail_url as string, sourceUrl);
  } else if (author.avatar_url || author.profile_image_url) {
    imageUrl = publicUrl((author.avatar_url ?? author.profile_image_url) as string, sourceUrl);
  } else if (statusId) {
    imageUrl = `https://d.fxtwitter.com/i/status/${statusId}.jpg`;
  }

  const title = extractShortHeadline(text, 14);
  const cleanText = cleanRawSocialMetadata(text);

  return {
    title,
    description: cleanText.slice(0, 1_000),
    imageUrl,
    authorName,
    providerName: "X / Twitter",
    canonicalUrl: (tweet.url as string | undefined) ?? sourceUrl
  };
}

export function parseInstagramEmbed(
  html: string,
  sourceUrl: string
): PreviewMetadata {
  const $ = load(html);
  const username =
    clean($("a.CaptionUsername").first().text()) ??
    clean($("a.Username").first().text()) ??
    clean($("meta[property='og:title']").attr("content"));
  const caption =
    clean($(".Caption").first().text()) ??
    clean($(".CaptionText").first().text()) ??
    clean($("meta[property='og:description']").attr("content"));
  const imageUrl =
    publicUrl($("img.EmbeddedMediaImage").first().attr("src"), sourceUrl) ??
    publicUrl($("meta[property='og:image']").attr("content"), sourceUrl);

  const authorName = username ? username.replace(/^@/, "").replace(/\s+on\s+Instagram.*$/i, "") : null;
  const title = extractShortHeadline(caption || username, 14);
  const cleanDescription = caption ? cleanRawSocialMetadata(caption) : null;

  return {
    title,
    description: cleanDescription ? cleanDescription.slice(0, 1_000) : null,
    imageUrl,
    authorName: authorName ? `@${authorName}` : null,
    providerName: "Instagram",
    canonicalUrl: sourceUrl
  };
}

export function directImageMetadata(sourceUrl: string): PreviewMetadata {
  const url = new URL(sourceUrl);
  const filename = url.pathname.split("/").filter(Boolean).pop() ?? "Image";
  const rawTitle = decodeURIComponent(filename)
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  const title = extractShortHeadline(rawTitle.length > 0 ? rawTitle : `Image from ${url.hostname}`, 14);

  return {
    title,
    description: "Direct image reference",
    imageUrl: sourceUrl,
    authorName: null,
    providerName: url.hostname.replace(/^www\./, ""),
    canonicalUrl: sourceUrl
  };
}

export function restrictedSourceFallback(
  sourceUrl: string,
  source: "youtube" | "x" | "instagram" | "article" | "image"
): PreviewMetadata {
  let title = "Saved idea";
  let providerName = "Web link";
  let imageUrl: string | null = null;
  let authorName: string | null = null;

  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.replace(/^www\./, "");
    if (source === "youtube") {
      const videoId = extractYouTubeVideoIdFromUrl(sourceUrl);
      title = "YouTube Video";
      providerName = "YouTube";
      if (videoId) {
        imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }
    } else if (source === "x") {
      const match = url.pathname.match(/^\/([^/]+)/);
      const user = match && match[1] && !["i", "intent", "explore"].includes(match[1]) ? match[1] : null;
      title = user ? `Post by @${user}` : "Saved post from X";
      providerName = "X / Twitter";
      authorName = user ? `@${user}` : null;
      const statusMatch = sourceUrl.match(/(?:status|statuses)\/(\d+)/i);
      if (statusMatch?.[1]) {
        imageUrl = `https://d.fxtwitter.com/i/status/${statusMatch[1]}.jpg`;
      }
    } else if (source === "instagram") {
      const match = url.pathname.match(/^\/([^/]+)/);
      const user = match && match[1] && !["p", "reel", "reels", "tv", "stories"].includes(match[1]) ? match[1] : null;
      title = user ? `Instagram post by @${user}` : "Saved Instagram post";
      providerName = "Instagram";
      authorName = user ? `@${user}` : null;
    } else if (source === "image") {
      return directImageMetadata(sourceUrl);
    } else {
      title = `Page from ${hostname}`;
      providerName = hostname;
    }
  } catch {
    // ignore parse error and use default fallback values
  }

  return {
    title: extractShortHeadline(title, 14),
    description: null,
    imageUrl,
    authorName,
    providerName,
    canonicalUrl: sourceUrl
  };
}
