import { describe, expect, it } from "vitest";
import { parseHtmlMetadata, parseOEmbedMetadata, restrictedSourceFallback } from "./providers.js";

describe("parseHtmlMetadata", () => {
  it("normalizes Open Graph metadata without retaining HTML", () => {
    const html = `
      <html><head>
        <title>Fallback title</title>
        <meta property="og:title" content="A better story &amp; why it matters" />
        <meta property="og:description" content="A useful reference" />
        <meta property="og:image" content="/images/cover.jpg" />
        <meta property="og:site_name" content="Example Journal" />
        <meta name="author" content="Mina Rao" />
        <link rel="canonical" href="https://example.com/canonical" />
      </head><body><script>alert('ignored')</script></body></html>`;

    expect(parseHtmlMetadata(html, "https://example.com/story")).toEqual({
      title: "A better story & why it matters",
      description: "A useful reference",
      imageUrl: "https://example.com/images/cover.jpg",
      authorName: "Mina Rao",
      providerName: "Example Journal",
      canonicalUrl: "https://example.com/canonical"
    });
  });

  it("falls back to the page title and hostname", () => {
    expect(parseHtmlMetadata("<title>Simple page</title>", "https://notes.example.com/a")).toEqual(
      expect.objectContaining({ title: "Simple page", providerName: "notes.example.com" })
    );
  });
});

describe("parseOEmbedMetadata", () => {
  it("maps YouTube oEmbed data to the shared preview shape", () => {
    expect(
      parseOEmbedMetadata(
        {
          title: "Creative tension",
          author_name: "Studio Channel",
          provider_name: "YouTube",
          thumbnail_url: "https://i.ytimg.com/vi/abc/hqdefault.jpg"
        },
        "https://youtu.be/abc"
      )
    ).toEqual({
      title: "Creative tension",
      description: null,
      imageUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
      authorName: "Studio Channel",
      providerName: "YouTube",
      canonicalUrl: "https://youtu.be/abc"
    });
  });
});

describe("restrictedSourceFallback", () => {
  it("keeps a useful X attribution without claiming extracted post text", () => {
    expect(restrictedSourceFallback("https://x.com/person/status/1", "x")).toEqual(
      expect.objectContaining({ title: "Saved post from X", providerName: "X / Twitter" })
    );
  });
});
