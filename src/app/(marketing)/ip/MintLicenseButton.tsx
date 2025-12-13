"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { Button } from "@/components/ui/button";
import { getStoryTxExplorerUrl } from "@/lib/story/explorer";

type Props = {
  licensorIpId: string;
  licenseTermsId: string;
};

export function MintLicenseButton({ licensorIpId, licenseTermsId }: Props) {
  const { address, isConnected } = useAccount();
  const client = useStoryClient();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleMint = async () => {
    if (!isConnected || !address) {
      setStatus("error");
      setErrorMessage("Connect a wallet on Story testnet to mint.");
      return;
    }
    if (!client) {
      setStatus("error");
      setErrorMessage("Wallet client not ready yet. Try again in a moment.");
      return;
    }
    try {
      setStatus("loading");
      setErrorMessage(null);
      setTxHash(null);
      const res = await client.license.mintLicenseTokens({
        licensorIpId: licensorIpId as `0x${string}`,
        licenseTermsId: BigInt(licenseTermsId),
        receiver: address,
        amount: 1,
      });
      setStatus("success");
      setTxHash(res.txHash ?? null);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("License mint failed. Check RPC or license terms.");
    }
  };

  const handleCopyTxHash = async () => {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
      toast.success("Transaction hash copied.");
    } catch (error) {
      console.error(error);
      toast.error("Could not copy transaction hash.");
    }
  };

  const explorerUrl = txHash ? getStoryTxExplorerUrl({ txHash }) : null;
  const remixHref = `/projects?parentIp=${encodeURIComponent(licensorIpId)}`;

  return (
    <div className="space-y-3">
      <Button
        onClick={handleMint}
        disabled={status === "loading"}
        className="w-full"
      >
        {status === "loading" ? "Minting..." : "Mint license token"}
      </Button>

      {status === "success" && txHash ? (
        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                License minted.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Transaction hash
              </p>
              <div className="mt-1 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md bg-background/60 px-2 py-1 font-mono text-[11px] text-foreground">
                  {txHash}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopyTxHash()}
                  aria-label="Copy transaction hash"
                  className="h-8 w-8 shrink-0"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href={remixHref}>Start remix project</Link>
            </Button>
            {explorerUrl ? (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={explorerUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  View on Explorer
                </a>
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Next: create a project, bring this clip into the Library (download
            from the player above), edit your remix, then export and publish.
          </p>
        </div>
      ) : null}

      {status === "error" && errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
