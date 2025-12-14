import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      return id || null;
    }

    if (parsed.hostname.endsWith("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return parts[1];
      if (parts[0] === "shorts" && parts[1]) return parts[1];
    }

    return null;
  } catch {
    return null;
  }
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

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatShortHash(value: string, visibleStart = 6, visibleEnd = 4) {
  if (!value) return value;
  const minLength = visibleStart + visibleEnd + 2;
  if (value.length <= minLength) return value;
  return `${value.slice(0, visibleStart)}…${value.slice(-visibleEnd)}`;
}
