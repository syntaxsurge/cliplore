"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { Button } from "@/components/ui/button";

type Props = {
  licensorIpId: string;
  licenseTermsId: string;
};

export function MintLicenseButton({ licensorIpId, licenseTermsId }: Props) {
  const { address, isConnected } = useAccount();
  const { getClient } = useStoryClient();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleMint = async () => {
    if (!isConnected || !address) {
      setStatus("error");
      setMessage("Connect a wallet on Story testnet to mint.");
      return;
    }
    try {
      setStatus("loading");
      setMessage(null);
      const client = await getClient();
      const res = await client.license.mintLicenseTokens({
        licensorIpId: licensorIpId as `0x${string}`,
        licenseTermsId: BigInt(licenseTermsId),
        receiver: address,
        amount: 1,
      });
      setStatus("success");
      setMessage(`Minted license token(s). Tx: ${res.txHash}`);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("License mint failed. Check RPC or license terms.");
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleMint} disabled={status === "loading"}>
        {status === "loading" ? "Minting..." : "Mint License & Remix"}
      </Button>
      {message && (
        <p
          className={`text-sm ${
            status === "success"
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-destructive"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
