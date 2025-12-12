import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/db/convex/client";

export async function GET() {
  try {
    const client = getConvexClient();
    const ipAssets = await (client as any).query(
      "functions/ipAssets:listMarketplace",
      {},
    );
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
    ipId,
    title,
    summary,
    terms,
    videoUrl,
    thumbnailUrl,
    licenseTermsId,
    txHash,
  } = body as {
    wallet?: string;
    localProjectId?: string;
    ipId?: string;
    title?: string;
    summary?: string;
    terms?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    licenseTermsId?: string;
    txHash?: string;
  };

  if (
    !wallet ||
    !localProjectId ||
    !ipId ||
    !title ||
    !summary ||
    !terms ||
    !videoUrl
  ) {
    return NextResponse.json(
      {
        error:
          "wallet, localProjectId, ipId, title, summary, terms, and videoUrl are required",
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
        ipId,
        title,
        summary,
        terms,
        videoUrl,
        thumbnailUrl,
        licenseTermsId,
        txHash,
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
