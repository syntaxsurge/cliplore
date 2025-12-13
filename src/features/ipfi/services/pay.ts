"use client";

import { WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";
import { parseEther, zeroAddress } from "viem";
import type { StoryClient } from "@story-protocol/core-sdk";

export async function tipIpWithWip(params: {
  client: StoryClient;
  receiverIpId: `0x${string}`;
  amountWip: string;
}) {
  const { client, receiverIpId, amountWip } = params;

  return client.royalty.payRoyaltyOnBehalf({
    receiverIpId,
    payerIpId: zeroAddress,
    token: WIP_TOKEN_ADDRESS,
    amount: parseEther(amountWip),
  });
}

