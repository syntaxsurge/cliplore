import { NextResponse } from "next/server";
import { z } from "zod";
import { getConvexClient } from "@/lib/db/convex/client";
import { datasetTypeSchema as datasetTypeSchemaZod } from "@/lib/story/dataset-metadata";

const upsertSchema = z.object({
  wallet: z.string().min(1),
  localProjectId: z.string().min(1).optional(),
  projectTitle: z.string().min(1).optional(),
  assetKind: z.enum(["video", "dataset"]).optional(),
  datasetType: datasetTypeSchemaZod.optional(),
  tags: z.array(z.string().min(1).max(48)).max(32).optional(),
  mediaMimeType: z.string().min(1).optional(),
  mediaSizeBytes: z.number().int().positive().optional(),
  ipId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  terms: z.string().min(1),
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1).optional(),
  videoSha256: z.string().min(1).optional(),
  thumbnailSha256: z.string().min(1).optional(),
  licenseTermsId: z.string().min(1).optional(),
  txHash: z.string().min(1).optional(),
  chainId: z.number().int().positive().optional(),
  ipMetadataUri: z.string().min(1).optional(),
  ipMetadataHash: z.string().min(1).optional(),
  nftMetadataUri: z.string().min(1).optional(),
  nftMetadataHash: z.string().min(1).optional(),
  videoKey: z.string().min(1).optional(),
  thumbnailKey: z.string().min(1).optional(),
});

const setArchivedSchema = z.object({
  wallet: z.string().min(1),
  ipId: z.string().min(1),
  archived: z.boolean(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const ipId = searchParams.get("ipId");
  const sha256 = searchParams.get("sha256");
  const assetKind = searchParams.get("assetKind");
  const includeArchivedParam = searchParams.get("includeArchived");
  const includeArchived =
    includeArchivedParam === "1" || includeArchivedParam === "true";

  try {
    const client = getConvexClient();
    if (sha256) {
      const matches = await (client as any).query("functions/ipAssets:findBySha256", {
        sha256,
      });
      return NextResponse.json({ matches });
    }
    if (ipId) {
      const ipAsset = await (client as any).query("functions/ipAssets:getByIpId", {
        ipId: ipId.toLowerCase(),
      });
      return NextResponse.json({ ipAsset });
    }

    if (assetKind) {
      const ipAssets = await (client as any).query(
        "functions/ipAssets:listByAssetKind",
        { assetKind },
      );
      return NextResponse.json({ ipAssets });
    }

    if (wallet) {
      const ipAssets = await (client as any).query(
        "functions/ipAssets:listByWallet",
        { wallet, includeArchived },
      );
      return NextResponse.json({ ipAssets });
    }

    const ipAssets = await (client as any).query("functions/ipAssets:listMarketplace", {});
    return NextResponse.json({ ipAssets });
  } catch (error) {
    console.error("Convex ipAssets:listMarketplace error", error);
    return NextResponse.json(
      { error: "Failed to load IP assets from Convex" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    wallet,
    localProjectId,
    projectTitle,
    assetKind,
    datasetType,
    tags,
    mediaMimeType,
    mediaSizeBytes,
    ipId,
    title,
    summary,
    terms,
    videoUrl,
    thumbnailUrl,
    videoSha256,
    thumbnailSha256,
    licenseTermsId,
    txHash,
    chainId,
    ipMetadataUri,
    ipMetadataHash,
    nftMetadataUri,
    nftMetadataHash,
    videoKey,
    thumbnailKey,
  } = parsed.data;

  try {
    const client = getConvexClient();
    await (client as any).mutation("functions/users:upsert", { wallet });
    const ipAsset = await (client as any).mutation(
      "functions/ipAssets:upsert",
      {
        wallet,
        localProjectId,
        projectTitle,
        assetKind,
        datasetType,
        tags,
        mediaMimeType,
        mediaSizeBytes,
        ipId,
        title,
        summary,
        terms,
        videoUrl,
        thumbnailUrl,
        videoSha256,
        thumbnailSha256,
        licenseTermsId,
        txHash,
        chainId,
        ipMetadataUri,
        ipMetadataHash,
        nftMetadataUri,
        nftMetadataHash,
        videoKey,
        thumbnailKey,
      },
    );
    return NextResponse.json({ ipAsset });
  } catch (error) {
    console.error("Convex ipAssets:create error", error);
    return NextResponse.json(
      { error: "Failed to create IP asset in Convex" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = setArchivedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { wallet, ipId, archived } = parsed.data;

  try {
    const client = getConvexClient();
    await (client as any).mutation("functions/users:upsert", { wallet });
    await (client as any).mutation("functions/ipAssets:setArchived", {
      wallet,
      ipId,
      archived,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Convex ipAssets:setArchived error", error);
    return NextResponse.json(
      { error: "Failed to update archive status in Convex" },
      { status: 500 },
    );
  }
}
