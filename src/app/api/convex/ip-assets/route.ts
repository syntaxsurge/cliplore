import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/db/convex/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const ipId = searchParams.get("ipId");
  const sha256 = searchParams.get("sha256");

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

    if (wallet) {
      const ipAssets = await (client as any).query(
        "functions/ipAssets:listByWallet",
        { wallet },
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
  const body = await req.json();
  const {
    wallet,
    localProjectId,
    projectTitle,
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
  } = body as {
    wallet?: string;
    localProjectId?: string;
    projectTitle?: string;
    ipId?: string;
    title?: string;
    summary?: string;
    terms?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    videoSha256?: string;
    thumbnailSha256?: string;
    licenseTermsId?: string;
    txHash?: string;
    chainId?: number;
    ipMetadataUri?: string;
    ipMetadataHash?: string;
    nftMetadataUri?: string;
    nftMetadataHash?: string;
    videoKey?: string;
    thumbnailKey?: string;
  };

  if (!wallet || !ipId || !title || !summary || !terms || !videoUrl) {
    return NextResponse.json(
      {
        error: "wallet, ipId, title, summary, terms, and videoUrl are required",
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexClient();
    await (client as any).mutation("functions/users:upsert", { wallet });
    const ipAsset = await (client as any).mutation(
      "functions/ipAssets:create",
      {
        wallet,
        localProjectId,
        projectTitle,
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
