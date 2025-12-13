import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { evidenceBundleSchema } from "@/lib/enforcement/evidence";
import { uploadJsonToIPFS } from "@/lib/storage/pinata";
import { stableJsonStringify } from "@/lib/utils";

export async function POST(req: Request) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = evidenceBundleSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid evidence bundle", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const evidence = result.data;
  const json = stableJsonStringify(evidence);
  const sha256 = `0x${createHash("sha256").update(json).digest("hex")}`;

  try {
    const uri = await uploadJsonToIPFS(evidence);
    const cid = uri.startsWith("ipfs://") ? uri.slice("ipfs://".length) : uri;
    return NextResponse.json({ uri, cid, sha256 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("pin-evidence error", message);
    return NextResponse.json(
      { error: "Failed to pin evidence to IPFS", details: message },
      { status: 500 },
    );
  }
}
