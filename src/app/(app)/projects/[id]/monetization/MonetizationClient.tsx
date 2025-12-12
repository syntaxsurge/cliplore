"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, zeroAddress } from "viem";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { clientEnv } from "@/lib/env/client";

type ClaimForm = {
  ancestorIpId: string;
  claimer: string;
  childIpIds: string;
  royaltyPolicies: string;
  currencyTokens: string;
};

type TipForm = {
  receiverIpId: string;
  payerIpId: string;
  token: string;
  amount: string;
};

export default function MonetizationClient({
  projectId,
}: {
  projectId: string;
}) {
  const { address, isConnected } = useAccount();
  const { getClient } = useStoryClient();
  const [tipForm, setTipForm] = useState<TipForm>({
    receiverIpId: "",
    payerIpId: zeroAddress,
    token: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS,
    amount: "1",
  });
  const [claimForm, setClaimForm] = useState<ClaimForm>({
    ancestorIpId: "",
    claimer: "",
    childIpIds: "",
    royaltyPolicies: "",
    currencyTokens: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS,
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [claimable, setClaimable] = useState<string | null>(null);

  const handleTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setStatus("error");
      setMessage("Connect a wallet to send royalty tips.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const client = await getClient();
      const res = await client.royalty.payRoyaltyOnBehalf({
        receiverIpId: tipForm.receiverIpId as `0x${string}`,
        payerIpId: (tipForm.payerIpId || zeroAddress) as `0x${string}`,
        token: tipForm.token as `0x${string}`,
        amount: parseEther(tipForm.amount || "0"),
      });
      setStatus("success");
      setMessage(`Royalty paid. Tx: ${res.txHash}`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Failed to send royalty payment.");
    }
  };

  const handleClaimable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setStatus("error");
      setMessage("Connect a wallet to query claimable revenue.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const client = await getClient();
      const amount = await client.royalty.claimableRevenue({
        ipId: claimForm.ancestorIpId as `0x${string}`,
        claimer: (claimForm.claimer || address) as `0x${string}`,
        token: claimForm.currencyTokens as `0x${string}`,
      });
      setClaimable(amount.toString());
      setStatus("success");
      setMessage("Claimable revenue fetched.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Failed to fetch claimable revenue.");
    }
  };

  const handleClaimAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setStatus("error");
      setMessage("Connect a wallet to claim revenue.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const client = await getClient();
      const childIpIds = claimForm.childIpIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as `0x${string}`[];
      const royaltyPolicies = claimForm.royaltyPolicies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as `0x${string}`[];
      const currencyTokens = claimForm.currencyTokens
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as `0x${string}`[];

      const res = await client.royalty.claimAllRevenue({
        ancestorIpId: claimForm.ancestorIpId as `0x${string}`,
        claimer: (claimForm.claimer || address) as `0x${string}`,
        childIpIds,
        royaltyPolicies,
        currencyTokens,
      });
      setStatus("success");
      setMessage(`Claimed revenue. Tx: ${res.txHashes?.[0] ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Failed to claim revenue.");
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Project</p>
        <h1 className="text-3xl font-semibold text-foreground">Monetization</h1>
        <p className="text-muted-foreground">
          Send tips via royalty payments and claim accrued revenue for IP
          Assets. Project ID: {projectId}
        </p>
      </div>

      <form
        onSubmit={handleTip}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Tip this IP
            </h2>
            <p className="text-sm text-muted-foreground">
              Uses `payRoyaltyOnBehalf` with payer set to zero address by
              default.
            </p>
          </div>
          <Badge variant={isConnected ? "success" : "warning"}>
            {isConnected ? "Wallet connected" : "Connect wallet"}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="receiverIpId">Receiver IP ID</Label>
            <Input
              id="receiverIpId"
              required
              placeholder="0x..."
              value={tipForm.receiverIpId}
              onChange={(e) =>
                setTipForm({ ...tipForm, receiverIpId: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payerIpId">Payer IP ID</Label>
            <Input
              id="payerIpId"
              placeholder="Defaults to 0x0"
              value={tipForm.payerIpId}
              onChange={(e) =>
                setTipForm({ ...tipForm, payerIpId: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipToken">Token address</Label>
            <Input
              id="tipToken"
              placeholder="0x..."
              value={tipForm.token}
              onChange={(e) =>
                setTipForm({ ...tipForm, token: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipAmount">Amount (WIP)</Label>
            <Input
              id="tipAmount"
              placeholder="1"
              value={tipForm.amount}
              onChange={(e) =>
                setTipForm({ ...tipForm, amount: e.target.value })
              }
            />
          </div>
        </div>
        <Button type="submit" disabled={!isConnected || status === "loading"}>
          {status === "loading" ? "Sending..." : "Send Tip"}
        </Button>
      </form>

      <form
        onSubmit={handleClaimable}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Claimable revenue
          </h2>
          {claimable && <Badge variant="outline">Claimable: {claimable}</Badge>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ancestorIpId">IP ID (royalty vault)</Label>
            <Input
              id="ancestorIpId"
              required
              placeholder="0x..."
              value={claimForm.ancestorIpId}
              onChange={(e) =>
                setClaimForm({ ...claimForm, ancestorIpId: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claimer">Claimer address</Label>
            <Input
              id="claimer"
              placeholder="Defaults to wallet"
              value={claimForm.claimer}
              onChange={(e) =>
                setClaimForm({ ...claimForm, claimer: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="currencyTokens">Revenue token address</Label>
            <Input
              id="currencyTokens"
              placeholder="0x..."
              value={claimForm.currencyTokens}
              onChange={(e) =>
                setClaimForm({ ...claimForm, currencyTokens: e.target.value })
              }
            />
          </div>
        </div>
        <Button type="submit" disabled={!isConnected || status === "loading"}>
          {status === "loading" ? "Fetching..." : "Check claimable"}
        </Button>
      </form>

      <form
        onSubmit={handleClaimAll}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Claim revenue
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="claimAncestorIpId">Ancestor IP ID</Label>
            <Input
              id="claimAncestorIpId"
              required
              placeholder="0x..."
              value={claimForm.ancestorIpId}
              onChange={(e) =>
                setClaimForm({ ...claimForm, ancestorIpId: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claimClaimer">Claimer address</Label>
            <Input
              id="claimClaimer"
              placeholder="Defaults to wallet"
              value={claimForm.claimer}
              onChange={(e) =>
                setClaimForm({ ...claimForm, claimer: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="childIpIds">Child IP IDs (comma-separated)</Label>
            <Textarea
              id="childIpIds"
              placeholder="0xabc..., 0xdef..."
              value={claimForm.childIpIds}
              onChange={(e) =>
                setClaimForm({ ...claimForm, childIpIds: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="royaltyPolicies">
              Royalty policies (comma-separated)
            </Label>
            <Textarea
              id="royaltyPolicies"
              placeholder="0x..., align with child IPs"
              value={claimForm.royaltyPolicies}
              onChange={(e) =>
                setClaimForm({ ...claimForm, royaltyPolicies: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="claimCurrencyTokens">
              Currency tokens (comma-separated)
            </Label>
            <Textarea
              id="claimCurrencyTokens"
              placeholder="0x..., 0x..."
              value={claimForm.currencyTokens}
              onChange={(e) =>
                setClaimForm({ ...claimForm, currencyTokens: e.target.value })
              }
            />
          </div>
        </div>
        <Button type="submit" disabled={!isConnected || status === "loading"}>
          {status === "loading" ? "Claiming..." : "Claim all revenue"}
        </Button>
      </form>

      {message && (
        <p
          className={`text-sm ${
            status === "error"
              ? "text-destructive"
              : "text-emerald-600 dark:text-emerald-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
