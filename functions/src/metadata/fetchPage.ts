import { assertSafePublicUrl } from "./urlSafety.js";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export class MetadataFetchError extends Error {
  constructor(
    public readonly code:
      | "blocked"
      | "not_found"
      | "timeout"
      | "unsafe_url"
      | "unsupported"
      | "invalid_response",
    message: string
  ) {
    super(message);
  }
}

export async function fetchPublicResource(value: string): Promise<{
  url: string;
  contentType: string;
  body: string;
}> {
  let current = value;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let safeUrl: string;
    try {
      safeUrl = await assertSafePublicUrl(current);
    } catch (error) {
      throw new MetadataFetchError("unsafe_url", (error as Error).message);
    }

    let response: Response;
    try {
      response = await fetch(safeUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
        headers: {
          accept: "text/html,application/json;q=0.9,*/*;q=0.1",
          "user-agent": "SecondBrainPreviewBot/1.0 (+https://shared-space-cca50.web.app)"
        }
      });
    } catch (error) {
      if ((error as Error).name === "TimeoutError") {
        throw new MetadataFetchError("timeout", "The source took too long to respond.");
      }
      throw new MetadataFetchError("blocked", "The source could not be reached.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) {
        throw new MetadataFetchError("invalid_response", "The source redirected too many times.");
      }
      current = new URL(location, safeUrl).toString();
      continue;
    }
    if (response.status === 404) throw new MetadataFetchError("not_found", "The source was not found.");
    if (!response.ok) throw new MetadataFetchError("blocked", "The source blocked preview access.");

    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_RESPONSE_BYTES) {
      throw new MetadataFetchError("invalid_response", "The source response is too large.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RESPONSE_BYTES) {
      throw new MetadataFetchError("invalid_response", "The source response is too large.");
    }
    return {
      url: safeUrl,
      contentType: response.headers.get("content-type") ?? "",
      body: new TextDecoder().decode(bytes)
    };
  }
  throw new MetadataFetchError("invalid_response", "The source redirected too many times.");
}
