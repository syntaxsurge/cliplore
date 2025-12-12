import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "@/lib/env/server";

function requireB2Env() {
  const missing: string[] = [];
  const endpoint = serverEnv.B2_S3_ENDPOINT;
  const region = serverEnv.B2_S3_REGION;
  const accessKeyId = serverEnv.B2_ACCESS_KEY_ID;
  const secretAccessKey = serverEnv.B2_SECRET_ACCESS_KEY;
  const bucket = serverEnv.B2_BUCKET;
  const publicBaseUrl = serverEnv.B2_PUBLIC_BASE_URL;

  if (!endpoint) missing.push("B2_S3_ENDPOINT");
  if (!region) missing.push("B2_S3_REGION");
  if (!accessKeyId) missing.push("B2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("B2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("B2_BUCKET");

  if (missing.length) {
    throw new Error(
      `Backblaze B2 S3 is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return {
    endpoint: endpoint!,
    region: region!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
    publicBaseUrl,
  };
}

let cachedClient: S3Client | null = null;

export function getB2S3Client() {
  if (cachedClient) return cachedClient;
  const cfg = requireB2Env();

  cachedClient = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

export function getB2Bucket() {
  return requireB2Env().bucket;
}

export function buildB2PublicUrl(key: string) {
  const cfg = requireB2Env();
  const normalizedKey = key.replace(/^\/+/, "");

  if (cfg.publicBaseUrl) {
    const base = cfg.publicBaseUrl.replace(/\/+$/, "");
    return `${base}/${normalizedKey}`;
  }

  const endpoint = cfg.endpoint.replace(/\/+$/, "");
  return `${endpoint}/${cfg.bucket}/${normalizedKey}`;
}
