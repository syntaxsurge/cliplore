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

export async function uploadFileToIPFS(file: File, options?: { name?: string }) {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required to upload files to IPFS.");
  }

  const form = new FormData();
  form.append("file", file, options?.name ?? file.name);
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: options?.name ?? file.name,
    }),
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.PINATA_JWT}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as PinResponse;
  return `ipfs://${data.IpfsHash}`;
}
