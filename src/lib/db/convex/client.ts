import "server-only";
import { ConvexHttpClient } from "convex/browser";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

let client: ConvexHttpClient | null = null;

export function getConvexClient() {
  if (client) return client;
  if (!url) {
    throw new Error(
      "Convex URL is not configured. Set NEXT_PUBLIC_CONVEX_URL.",
    );
  }
  client = new ConvexHttpClient(url);
  return client;
}
