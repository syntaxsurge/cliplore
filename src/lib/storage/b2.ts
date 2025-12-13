import "server-only";

import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
  type CORSRule,
} from "@aws-sdk/client-s3";
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

function normalizeCorsValue(value: string) {
  return value.trim().toLowerCase();
}

function corsRuleAllowsUpload(rule: CORSRule, origin: string) {
  const allowedOrigins = rule.AllowedOrigins?.map(normalizeCorsValue) ?? [];
  const allowedMethods = rule.AllowedMethods?.map((m) => m.toUpperCase()) ?? [];
  const allowedHeaders = rule.AllowedHeaders?.map(normalizeCorsValue) ?? [];

  const originValue = normalizeCorsValue(origin);
  const originAllowed =
    allowedOrigins.includes("*") || allowedOrigins.includes(originValue);
  if (!originAllowed) return false;

  if (!allowedMethods.includes("PUT")) return false;

  const headerAllowed =
    allowedHeaders.includes("*") || allowedHeaders.includes("content-type");
  return headerAllowed;
}

async function getBucketCorsRules(client: S3Client, bucket: string) {
  try {
    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    return res.CORSRules ?? [];
  } catch (error: any) {
    const status =
      error && typeof error === "object" && "$metadata" in error
        ? (error.$metadata?.httpStatusCode as number | undefined)
        : undefined;
    const name =
      error && typeof error === "object" && "name" in error
        ? String(error.name)
        : "";
    if (name === "NoSuchCORSConfiguration" || status === 404) return [];
    throw error;
  }
}

export async function ensureB2BucketCorsForOrigin(origin: string) {
  const parsed = new URL(origin);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("origin must be http(s)");
  }

  const client = getB2S3Client();
  const bucket = getB2Bucket();
  const existing = await getBucketCorsRules(client, bucket);

  const alreadyConfigured = existing.some((rule) =>
    corsRuleAllowsUpload(rule, origin),
  );
  if (alreadyConfigured) {
    return { updated: false, ruleCount: existing.length };
  }

  const next: CORSRule = {
    AllowedOrigins: [origin],
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: [...existing, next] },
    }),
  );

  return { updated: true, ruleCount: existing.length + 1 };
}
