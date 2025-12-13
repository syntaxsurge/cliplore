"use client";

import type { StoryClient } from "@story-protocol/core-sdk";

const ROYALTY_TOKEN_UNITS_PER_PERCENT = 1_000_000;
const MAX_ROYALTY_TOKEN_UNITS = 100_000_000;

function parsePercentToRoyaltyUnits(percentText: string): number {
  const trimmed = percentText.trim();
  if (!trimmed) throw new Error("Percent is required.");
  if (!/^(?:\\d+)(?:\\.\\d+)?$/.test(trimmed)) {
    throw new Error("Percent must be a number.");
  }

  const [wholeText, fractionTextRaw = ""] = trimmed.split(".");
  const whole = Number(wholeText);

  if (!Number.isFinite(whole) || whole < 0) {
    throw new Error("Percent must be a positive number.");
  }
  if (whole > 100) {
    throw new Error("Percent cannot exceed 100.");
  }

  const fractionText = fractionTextRaw.slice(0, 6).padEnd(6, "0");
  const fraction = fractionText ? Number(fractionText) : 0;

  if (!Number.isFinite(fraction) || fraction < 0) {
    throw new Error("Percent must be a number.");
  }

  const units = whole * ROYALTY_TOKEN_UNITS_PER_PERCENT + fraction;

  if (!Number.isInteger(units) || units < 0) {
    throw new Error("Percent is invalid.");
  }
  if (units > MAX_ROYALTY_TOKEN_UNITS) {
    throw new Error("Percent cannot exceed 100.");
  }
  if (units === 0) {
    throw new Error("Percent must be greater than 0.");
  }

  return units;
}

export async function transferRoyaltyPercentToWallet(params: {
  client: StoryClient;
  ipId: `0x${string}`;
  target: `0x${string}`;
  percent: string;
}) {
  const { client, ipId, target, percent } = params;

  const amount = parsePercentToRoyaltyUnits(percent);
  const royaltyVaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId);

  return client.ipAccount.transferErc20({
    ipId,
    tokens: [
      {
        address: royaltyVaultAddress,
        amount,
        target,
      },
    ],
  });
}

