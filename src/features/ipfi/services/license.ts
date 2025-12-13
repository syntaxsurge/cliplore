"use client";

import { PILFlavor } from "@story-protocol/core-sdk";
import { parseEther } from "viem";
import { clientEnv } from "@/lib/env/client";
import type { StoryClient } from "@story-protocol/core-sdk";

export async function setCommercialRemixTerms(params: {
  client: StoryClient;
  ipId: `0x${string}`;
  mintingFeeWip: string;
  commercialRevSharePercent: number;
}) {
  const { client, ipId, mintingFeeWip, commercialRevSharePercent } = params;

  if (
    !Number.isFinite(commercialRevSharePercent) ||
    commercialRevSharePercent < 0 ||
    commercialRevSharePercent > 100
  ) {
    throw new Error("Commercial revenue share must be between 0 and 100.");
  }

  const terms = PILFlavor.commercialRemix({
    commercialRevShare: commercialRevSharePercent,
    defaultMintingFee: parseEther(mintingFeeWip || "0"),
    currency: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
  });

  const res = await client.license.registerPilTermsAndAttach({
    ipId,
    licenseTermsData: [{ terms }],
  });

  const licenseTermsId = res.licenseTermsIds?.[0];
  if (!licenseTermsId) {
    throw new Error("Story did not return a licenseTermsId.");
  }

  return { txHash: res.txHash, licenseTermsId };
}

