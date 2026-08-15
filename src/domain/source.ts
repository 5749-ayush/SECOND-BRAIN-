import type { SourceType } from "./idea";

const HOST_SOURCE_MAP: Record<string, SourceType> = {
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "music.youtube.com": "youtube",
  "youtu.be": "youtube",
  "x.com": "x",
  "mobile.x.com": "x",
  "twitter.com": "x",
  "mobile.twitter.com": "x",
  "fxtwitter.com": "x",
  "vxtwitter.com": "x",
  "fixupx.com": "x",
  "instagram.com": "instagram",
  "instagr.am": "instagram",
  "ddinstagram.com": "instagram"
};

const IMAGE_EXTENSION_REGEX = /\.(?:jpe?g|png|gif|webp|svg|avif)(?:\?.*)?$/i;

export function isDirectImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return IMAGE_EXTENSION_REGEX.test(url.pathname);
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(normalizePublicUrl(value));
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

export function getYouTubeThumbnail(value: string): string | null {
  const videoId = extractYouTubeVideoId(value);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function normalizePublicUrl(value: string): string {
  const url = new URL(value.trim());

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http and https URLs are supported.");
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

export function extractXTweetId(value: string): string | null {
  try {
    const url = new URL(normalizePublicUrl(value));
    const hostname = url.hostname.replace(/^www\./, "");
    if (
      hostname === "x.com" ||
      hostname === "mobile.x.com" ||
      hostname === "twitter.com" ||
      hostname === "mobile.twitter.com" ||
      hostname === "fxtwitter.com" ||
      hostname === "vxtwitter.com" ||
      hostname === "fixupx.com"
    ) {
      const match = url.pathname.match(/(?:status|statuses)\/(\d+)/i);
      return match?.[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapSvgText(text: string, maxCharsPerLine: number = 28, maxLines: number = 4): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (words.length > 0 && lines.length > 0 && words.join(" ") !== lines.join(" ")) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:]+$/, "") + "…";
  }
  return lines;
}

export function generateXEditorialThumbnail(
  title?: string | null,
  creatorName?: string | null
): string {
  const cleanTitle = (title && title.trim().length > 0 ? title.trim() : "Saved post from X")
    .replace(/^["'“‘`]+|["'”’`]+$/g, "")
    .trim();
  const cleanCreator = creatorName ? creatorName.trim() : "X / Twitter";
  const lines = wrapSvgText(cleanTitle, 26, 4);

  const startY = lines.length <= 2 ? 460 : lines.length === 3 ? 420 : 380;
  const lineHeight = 86;
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="84" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c202a"/>
      <stop offset="55%" stop-color="#07131a"/>
      <stop offset="100%" stop-color="#03080c"/>
    </linearGradient>
    <radialGradient id="goldGlow" cx="88%" cy="12%" r="55%">
      <stop offset="0%" stop-color="#d5a65a" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#d5a65a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tealAmbient" cx="12%" cy="88%" r="50%">
      <stop offset="0%" stop-color="#19404c" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#19404c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#cardBg)"/>
  <rect width="1200" height="900" fill="url(#goldGlow)"/>
  <rect width="1200" height="900" fill="url(#tealAmbient)"/>
  
  <circle cx="1020" cy="180" r="300" fill="none" stroke="#d5a65a" stroke-opacity="0.08" stroke-width="2"/>
  <circle cx="1020" cy="180" r="180" fill="none" stroke="#d5a65a" stroke-opacity="0.12" stroke-width="1.5"/>
  <circle cx="1020" cy="180" r="75" fill="none" stroke="#d5a65a" stroke-opacity="0.18" stroke-width="1"/>

  <!-- Minimalist X glyph -->
  <g transform="translate(1030, 110)">
    <path d="M0,0 L32,44 L0,88 L8,88 L36,50 L64,88 L96,88 L60,40 L90,0 L82,0 L56,34 L30,0 Z" fill="#f4efe6" fill-opacity="0.25"/>
  </g>

  <!-- Author / Source badge -->
  <rect x="84" y="110" width="auto" height="52" rx="26" fill="rgba(213, 166, 90, 0.12)" stroke="rgba(213, 166, 90, 0.28)" stroke-width="1.5"/>
  <text x="84" y="148" fill="#d5a65a" font-family="Inter, -apple-system, sans-serif" font-size="28" font-weight="600" letter-spacing="1">
    ${escapeXml(cleanCreator.toUpperCase())}
  </text>

  <!-- Title typography -->
  <text fill="#f4efe6" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="400" letter-spacing="-0.5">
    ${tspans}
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getXThumbnail(
  value: string,
  title?: string | null,
  creatorName?: string | null
): string | null {
  const tweetId = extractXTweetId(value);
  if (tweetId) {
    return `https://d.fxtwitter.com/i/status/${tweetId}.jpg`;
  }
  if (title || creatorName) {
    return generateXEditorialThumbnail(title, creatorName);
  }
  return null;
}

export function detectSourceType(value: string): SourceType {
  const url = new URL(normalizePublicUrl(value));
  const hostname = url.hostname.replace(/^www\./, "");
  if (isDirectImageUrl(url.toString())) {
    return "image";
  }
  return HOST_SOURCE_MAP[hostname] ?? "article";
}


