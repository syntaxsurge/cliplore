"use client";

import { parseEther } from "viem";
import type { StoryClient } from "@story-protocol/core-sdk";

export async function wrapIpToWip(params: {
  client: StoryClient;
  amountIp: string;
}) {
  const { client, amountIp } = params;
  return client.wipClient.deposit({
    amount: parseEther(amountIp),
  });
}

export async function unwrapWipToIp(params: {
  client: StoryClient;
  amountWip: string;
}) {
  const { client, amountWip } = params;
  return client.wipClient.withdraw({
    amount: parseEther(amountWip),
  });
}

