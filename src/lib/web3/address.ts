import { getAddress } from "viem";

export function getWalletSearchVariants(wallet: string) {
  const trimmed = wallet.trim();
  if (!trimmed) return [];

  const variants = new Set<string>([trimmed, trimmed.toLowerCase()]);
  try {
    variants.add(getAddress(trimmed));
  } catch {
    // ignore invalid addresses
  }

  return Array.from(variants);
}

