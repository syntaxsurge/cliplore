"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, zeroAddress } from "viem";
import { clientEnv } from "@/lib/env/client";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TipForm = {
  receiverIpId: string;
  payerIpId: string;
  token: string;
  amount: string;
};

type ClaimForm = {
  ancestorIpId: string;
  claimer: string;
  childIpIds: string;
  royaltyPolicies: string;
  currencyTokens: string;
};

export function RoyaltiesPanel({ ipId }: { ipId: string }) {
  const { address, isConnected } = useAccount();
  const { getClient } = useStoryClient();

  const defaultToken = clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS;

  const [tipForm, setTipForm] = useState<TipForm>({
    receiverIpId: ipId,
    payerIpId: zeroAddress,
    token: defaultToken,
    amount: "1",
  });

  const [claimForm, setClaimForm] = useState<ClaimForm>({
    ancestorIpId: ipId,
    claimer: "",
    childIpIds: "",
    royaltyPolicies: "",
    currencyTokens: defaultToken,
  });

  const [tipStatus, setTipStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [tipMessage, setTipMessage] = useState<string | null>(null);

  const [claimStatus, setClaimStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimable, setClaimable] = useState<string | null>(null);

  const [claimAllStatus, setClaimAllStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [claimAllMessage, setClaimAllMessage] = useState<string | null>(null);

  const effectiveClaimer = useMemo(() => {
    return claimForm.claimer || address || "";
  }, [address, claimForm.claimer]);

  const handleTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setTipStatus("error");
      setTipMessage("Connect a wallet to send royalty tips.");
      return;
    }

    setTipStatus("loading");
    setTipMessage(null);
    try {
      const client = await getClient();
      const res = await client.royalty.payRoyaltyOnBehalf({
        receiverIpId: tipForm.receiverIpId as `0x${string}`,
        payerIpId: (tipForm.payerIpId || zeroAddress) as `0x${string}`,
        token: tipForm.token as `0x${string}`,
        amount: parseEther(tipForm.amount || "0"),
      });
      setTipStatus("success");
      setTipMessage(`Royalty paid. Tx: ${res.txHash}`);
    } catch (err: any) {
      console.error(err);
      setTipStatus("error");
      setTipMessage(err?.message ?? "Failed to send royalty payment.");
    }
  };

  const handleClaimable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setClaimStatus("error");
      setClaimMessage("Connect a wallet to query claimable revenue.");
      return;
    }
    if (!effectiveClaimer) {
      setClaimStatus("error");
      setClaimMessage("Claimer address is required.");
      return;
    }

    setClaimStatus("loading");
    setClaimMessage(null);
    try {
      const client = await getClient();
      const amount = await client.royalty.claimableRevenue({
        ipId: claimForm.ancestorIpId as `0x${string}`,
        claimer: effectiveClaimer as `0x${string}`,
        token: claimForm.currencyTokens as `0x${string}`,
      });
      setClaimable(amount.toString());
      setClaimStatus("success");
      setClaimMessage("Claimable revenue fetched.");
    } catch (err: any) {
      console.error(err);
      setClaimStatus("error");
      setClaimMessage(err?.message ?? "Failed to fetch claimable revenue.");
    }
  };

  const handleClaimAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setClaimAllStatus("error");
      setClaimAllMessage("Connect a wallet to claim revenue.");
      return;
    }
    if (!effectiveClaimer) {
      setClaimAllStatus("error");
      setClaimAllMessage("Claimer address is required.");
      return;
    }

    setClaimAllStatus("loading");
    setClaimAllMessage(null);
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
        claimer: effectiveClaimer as `0x${string}`,
        childIpIds,
        royaltyPolicies,
        currencyTokens,
      });
      setClaimAllStatus("success");
      setClaimAllMessage(
        `Claimed revenue. Tx: ${res.txHashes?.[0] ?? "submitted"}`,
      );
    } catch (err: any) {
      console.error(err);
      setClaimAllStatus("error");
      setClaimAllMessage(err?.message ?? "Failed to claim revenue.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Royalties & revenue</CardTitle>
        <CardDescription>
          Claim revenue from derivatives and accept tips via Story royalty flows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form onSubmit={handleTip} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              Send a tip
            </h3>
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
          <Button type="submit" disabled={!isConnected || tipStatus === "loading"}>
            {tipStatus === "loading" ? "Sending…" : "Send tip"}
          </Button>
          {tipMessage ? (
            <p
              className={`text-sm ${
                tipStatus === "error"
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-300"
              }`}
            >
              {tipMessage}
            </p>
          ) : null}
        </form>

        <form onSubmit={handleClaimable} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              Claimable revenue
            </h3>
            {claimable ? (
              <Badge variant="outline">Claimable: {claimable}</Badge>
            ) : null}
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
          <Button
            type="submit"
            disabled={!isConnected || claimStatus === "loading"}
          >
            {claimStatus === "loading" ? "Fetching…" : "Check claimable"}
          </Button>
          {claimMessage ? (
            <p
              className={`text-sm ${
                claimStatus === "error"
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-300"
              }`}
            >
              {claimMessage}
            </p>
          ) : null}
        </form>

        <form onSubmit={handleClaimAll} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              Claim revenue
            </h3>
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
          <Button
            type="submit"
            disabled={!isConnected || claimAllStatus === "loading"}
          >
            {claimAllStatus === "loading" ? "Claiming…" : "Claim all revenue"}
          </Button>
          {claimAllMessage ? (
            <p
              className={`text-sm ${
                claimAllStatus === "error"
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-300"
              }`}
            >
              {claimAllMessage}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

