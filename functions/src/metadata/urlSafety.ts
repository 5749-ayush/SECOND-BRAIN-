import { lookup as dnsLookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export type AddressLookup = (
  hostname: string
) => Promise<readonly { address: string; family: number }[]>;

const defaultLookup: AddressLookup = async (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true });

export function isPrivateAddress(address: string): boolean {
  let parsed = ipaddr.parse(address);
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  const range = parsed.range();
  return !["unicast"].includes(range);
}

export async function assertSafePublicUrl(
  value: string,
  lookup: AddressLookup = defaultLookup
): Promise<string> {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only public http and https URLs are supported.");
  }
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Only standard web ports are supported.");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local addresses are not supported.");
  }

  if (ipaddr.isValid(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("The URL resolves to a private address.");
  } else {
    const addresses = await lookup(hostname);
    if (addresses.length === 0) throw new Error("The hostname could not be resolved.");
    if (addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new Error("The URL resolves to a private address.");
    }
  }

  url.hash = "";
  url.hostname = hostname;
  return url.toString();
}
