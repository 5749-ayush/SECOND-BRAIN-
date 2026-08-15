import { describe, expect, it } from "vitest";
import { assertSafePublicUrl, isPrivateAddress } from "./urlSafety.js";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.2.4",
    "192.168.1.4",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "fe80::1"
  ])("rejects private address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it("allows a public address", () => {
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});

describe("assertSafePublicUrl", () => {
  it("rejects local hosts, credentials, unsupported protocols, and ports", async () => {
    const lookup = async () => [{ address: "8.8.8.8", family: 4 }];
    await expect(assertSafePublicUrl("http://localhost/secret", lookup)).rejects.toThrow();
    await expect(assertSafePublicUrl("https://user:pass@example.com", lookup)).rejects.toThrow();
    await expect(assertSafePublicUrl("file:///secret", lookup)).rejects.toThrow();
    await expect(assertSafePublicUrl("https://example.com:8443", lookup)).rejects.toThrow();
  });

  it("rejects a hostname that resolves to a private address", async () => {
    const lookup = async () => [{ address: "10.0.0.8", family: 4 }];
    await expect(assertSafePublicUrl("https://example.com", lookup)).rejects.toThrow(/private/i);
  });

  it("returns a normalized URL when every resolved address is public", async () => {
    const lookup = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
    ];
    await expect(assertSafePublicUrl("HTTPS://Example.COM/story#part", lookup)).resolves.toBe(
      "https://example.com/story"
    );
  });
});
