import { NextResponse } from "next/server";
import { uploadFileToIPFS } from "@/lib/storage/pinata";
import { ipfsUriToGatewayUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const name = formData.get("name");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "file must be non-empty" },
        { status: 400 },
      );
    }

    const ipfsUri = await uploadFileToIPFS(file, {
      name: typeof name === "string" && name.trim() ? name.trim() : undefined,
    });
    const gatewayUrl = ipfsUriToGatewayUrl(ipfsUri);

    return NextResponse.json({ ipfsUri, gatewayUrl });
  } catch (error) {
    console.error("pin-file error", error);
    const message =
      error instanceof Error ? error.message : "Failed to pin file to IPFS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

