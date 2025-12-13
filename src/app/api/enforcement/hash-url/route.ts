import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { ipfsUriToGatewayUrl } from "@/lib/utils";

const requestSchema = z.object({
  url: z.string().min(1),
  maxBytes: z.number().int().positive().max(200 * 1024 * 1024).optional(),
  maxRedirects: z.number().int().nonnegative().max(5).optional(),
});

function isPrivateIp(ip: string): boolean {
  if (ip === "::1") return true;
  if (ip.startsWith("fe80:")) return true; // IPv6 link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 ULA

  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;

  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

async function assertSafeUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed.");
  }

  const hostname = url.hostname;
  if (!hostname) throw new Error("URL hostname is required.");
  if (hostname === "localhost") throw new Error("localhost is not allowed.");

  const directIp = isIP(hostname) ? hostname : null;
  if (directIp) {
    if (isPrivateIp(directIp)) throw new Error("Private IPs are not allowed.");
    return;
  }

  const results = await lookup(hostname, { all: true, verbatim: true });
  for (const result of results) {
    if (isPrivateIp(result.address)) {
      throw new Error("URL resolves to a private IP.");
    }
  }
}

async function fetchWithRedirects(
  input: URL,
  maxRedirects: number,
): Promise<Response> {
  let url = input;

  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeUrl(url);

    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });

    const location = res.headers.get("location");
    if (location && res.status >= 300 && res.status < 400) {
      url = new URL(location, url);
      continue;
    }

    return res;
  }

  throw new Error("Too many redirects.");
}

async function sha256HexFromResponseBody(
  res: Response,
  maxBytes: number,
): Promise<{ sha256: string; bytes: number }> {
  if (!res.body) throw new Error("Upstream response has no body.");

  const reader = res.body.getReader();
  const hash = createHash("sha256");
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(
          `Remote content exceeds maxBytes (${maxBytes.toLocaleString()}).`,
        );
      }
      hash.update(Buffer.from(value));
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }

  return { sha256: `0x${hash.digest("hex")}`, bytes: total };
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const maxBytes = parsed.data.maxBytes ?? 50 * 1024 * 1024;
  const maxRedirects = parsed.data.maxRedirects ?? 3;

  let url: URL;
  try {
    url = new URL(ipfsUriToGatewayUrl(parsed.data.url));
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetchWithRedirects(url, maxRedirects);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream responded ${res.status}` },
        { status: 400 },
      );
    }

    const { sha256, bytes } = await sha256HexFromResponseBody(res, maxBytes);
    return NextResponse.json({
      url: url.toString(),
      sha256,
      bytes,
      contentType: res.headers.get("content-type"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

