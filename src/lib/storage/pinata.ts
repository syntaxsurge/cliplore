import { serverEnv } from "@/lib/env/server";

type PinResponse = {
  IpfsHash: string;
};

export async function uploadJsonToIPFS(payload: unknown) {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required to upload metadata to IPFS.");
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.PINATA_JWT}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as PinResponse;
  return `ipfs://${data.IpfsHash}`;
}
