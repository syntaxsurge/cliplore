import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stableJsonStringify(value: unknown) {
  const seen = new WeakSet<object>();

  const normalize = (input: any): any => {
    if (input === null || typeof input !== "object") return input;
    if (input instanceof Date) return input.toISOString();

    if (seen.has(input)) {
      throw new TypeError("Cannot stable stringify circular structure");
    }
    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => normalize(item));
    }

    const keys = Object.keys(input).sort();
    const out: Record<string, any> = {};
    for (const key of keys) {
      const v = (input as Record<string, any>)[key];
      if (typeof v === "undefined") continue;
      out[key] = normalize(v);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

export function ipfsUriToGatewayUrl(
  ipfsUri: string,
  gatewayBase = "https://gateway.pinata.cloud/ipfs/",
) {
  if (!ipfsUri) return ipfsUri;
  if (ipfsUri.startsWith("http://") || ipfsUri.startsWith("https://")) {
    return ipfsUri;
  }
  if (!ipfsUri.startsWith("ipfs://")) return ipfsUri;
  const path = ipfsUri.slice("ipfs://".length).replace(/^ipfs\//, "");
  return `${gatewayBase}${path}`;
}
