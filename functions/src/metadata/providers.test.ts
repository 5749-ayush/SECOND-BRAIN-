import { describe, expect, it } from "vitest";
import {
  directImageMetadata,
  extractYouTubeVideoIdFromUrl,
  parseFxTwitterMetadata,
  parseHtmlMetadata,
  parseInstagramEmbed,
  parseOEmbedMetadata,
  restrictedSourceFallback
} from "./providers.js";

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
      description: "YouTube video by Studio Channel",
      imageUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
      authorName: "Studio Channel",
      providerName: "YouTube",
      canonicalUrl: "https://youtu.be/abc"
    });
  });

  it("extracts tweet text from Twitter oEmbed HTML block", () => {
    const twitterOembed = {
      author_name: "Tech Creator",
      author_url: "https://twitter.com/techcreator",
      html: "<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">Building the second brain interface with React &amp; Tailwind</p>&mdash; Tech Creator (@techcreator) <a href=\"https://twitter.com/techcreator/status/123\">August 15, 2026</a></blockquote>",
      provider_name: "Twitter"
    };

    const result = parseOEmbedMetadata(twitterOembed, "https://x.com/techcreator/status/123");
    expect(result.title).toBe("Building the second brain interface with React & Tailwind");
    expect(result.authorName).toBe("Tech Creator");
    expect(result.providerName).toBe("Twitter");
  });
});

describe("parseFxTwitterMetadata", () => {
  it("extracts tweet text, high-res photo, and author handle from FxTwitter response", () => {
    const fxData = {
      code: 200,
      tweet: {
        url: "https://twitter.com/designer/status/987",
        text: "Here is the new design system for video ideas.",
        author: {
          name: "Design Studio",
          screen_name: "designstudio",
          avatar_url: "https://pbs.twimg.com/profile_images/1/avatar.jpg"
        },
        media: {
          photos: [{ url: "https://pbs.twimg.com/media/preview.jpg" }]
        }
      }
    };

    const result = parseFxTwitterMetadata(fxData, "https://x.com/designer/status/987");
    expect(result).toEqual({
      title: "Here is the new design system for video ideas",
      description: "Here is the new design system for video ideas.",
      imageUrl: "https://pbs.twimg.com/media/preview.jpg",
      authorName: "Design Studio (@designstudio)",
      providerName: "X / Twitter",
      canonicalUrl: "https://twitter.com/designer/status/987"
    });
  });

  it("extracts external card and quote tweet media when direct photos are absent", () => {
    const fxCardData = {
      code: 200,
      tweet: {
        url: "https://twitter.com/dev/status/555",
        text: "Check this out",
        author: { name: "Developer", screen_name: "dev" },
        card: { image_url: "https://example.com/card-image.jpg" }
      }
    };

    const result = parseFxTwitterMetadata(fxCardData, "https://x.com/dev/status/555");
    expect(result.imageUrl).toBe("https://example.com/card-image.jpg");
  });

  it("falls back to d.fxtwitter status image for text-only tweets", () => {
    const fxTextData = {
      code: 200,
      tweet: {
        url: "https://twitter.com/dev/status/999",
        text: "Just a thought without media",
        author: { name: "Developer", screen_name: "dev" }
      }
    };

    const result = parseFxTwitterMetadata(fxTextData, "https://x.com/dev/status/999");
    expect(result.imageUrl).toBe("https://d.fxtwitter.com/i/status/999.jpg");
  });
});

describe("parseInstagramEmbed", () => {
  it("extracts caption, author username, and embedded image from Instagram embed HTML", () => {
    const embedHtml = `
      <html><body>
        <div class="Caption"><a class="CaptionUsername">creator</a> Filming behind the scenes setup</div>
        <img class="EmbeddedMediaImage" src="https://instagram.example/p123.jpg" />
      </body></html>
    `;

    const result = parseInstagramEmbed(embedHtml, "https://www.instagram.com/p/DA123/");
    expect(result.imageUrl).toBe("https://instagram.example/p123.jpg");
    expect(result.authorName).toBe("@creator");
    expect(result.providerName).toBe("Instagram");
    expect(result.description).toContain("Filming behind the scenes setup");
  });
});

describe("directImageMetadata", () => {
  it("formats direct image URLs into clean preview metadata", () => {
    const result = directImageMetadata("https://images.example.com/cinematic-lighting-setup.jpg");
    expect(result).toEqual({
      title: "cinematic lighting setup",
      description: "Direct image reference",
      imageUrl: "https://images.example.com/cinematic-lighting-setup.jpg",
      authorName: null,
      providerName: "images.example.com",
      canonicalUrl: "https://images.example.com/cinematic-lighting-setup.jpg"
    });
  });
});

describe("extractYouTubeVideoIdFromUrl", () => {
  it("extracts video ID from standard and short YouTube URLs", () => {
    expect(extractYouTubeVideoIdFromUrl("https://youtube.com/watch?v=12345")).toBe("12345");
    expect(extractYouTubeVideoIdFromUrl("https://youtu.be/12345")).toBe("12345");
    expect(extractYouTubeVideoIdFromUrl("https://www.youtube.com/shorts/12345")).toBe("12345");
  });
});

describe("restrictedSourceFallback", () => {
  it("keeps a useful X attribution and fallback title and thumbnail", () => {
    expect(restrictedSourceFallback("https://x.com/person/status/1", "x")).toEqual(
      expect.objectContaining({
        title: "Post by @person",
        providerName: "X / Twitter",
        authorName: "@person",
        imageUrl: "https://d.fxtwitter.com/i/status/1.jpg"
      })
    );
  });

  it("extracts YouTube video thumbnail even in fallback mode", () => {
    expect(restrictedSourceFallback("https://youtu.be/video777", "youtube")).toEqual(
      expect.objectContaining({
        title: "YouTube Video",
        providerName: "YouTube",
        imageUrl: "https://i.ytimg.com/vi/video777/hqdefault.jpg"
      })
    );
  });
});

