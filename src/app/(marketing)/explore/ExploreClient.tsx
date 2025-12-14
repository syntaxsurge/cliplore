"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Database,
  Film,
  PlusCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import IpAssetCard from "./IpAssetCard";
import type { ExploreAsset } from "./types";

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function ExploreClient(props: {
  initialAssets: ExploreAsset[];
  hadError: boolean;
}) {
  const { initialAssets, hadError } = props;
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeQuery(query);

  const filteredAssets = useMemo(() => {
    if (!normalizedQuery) return initialAssets;
    return initialAssets.filter((asset) => {
      const haystack = [
        asset.title,
        asset.summary,
        asset.terms,
        asset.ipId,
        asset.licensorWallet,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [initialAssets, normalizedQuery]);

  const hasAssets = initialAssets.length > 0;
  const hasQuery = normalizeQuery(query).length > 0;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Marketplace</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Explore IP
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              Rights-cleared video IP assets registered on Story Protocol. Each
              listing includes the IP Asset ID, creator wallet, and licensing
              terms so remixing stays safe by design.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/projects">
                <PlusCircle />
                Open studio
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/datasets">
                <Database />
                Explore datasets
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, IP Asset ID, wallet, or license terms…"
                  className="pl-9"
                  aria-label="Search IP marketplace"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hadError ? (
                  <Badge variant="warning">Marketplace degraded</Badge>
                ) : null}
                <Badge variant="outline" className="tabular-nums">
                  {filteredAssets.length}{" "}
                  {filteredAssets.length === 1 ? "result" : "results"}
                </Badge>
                {hasQuery ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuery("")}
                  >
                    <XCircle />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {hadError && !hasAssets ? (
          <Card>
            <CardHeader>
              <CardTitle>Marketplace temporarily unavailable</CardTitle>
              <CardDescription>
                We couldn’t load the marketplace right now. Try again in a
                moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/explore">
                  <RefreshCw />
                  Retry
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/projects">
                  <Film />
                  Open studio
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : !hasAssets ? (
          <Card>
            <CardHeader>
              <CardTitle>No IP assets yet</CardTitle>
              <CardDescription>
                Registered IP from Cliplore projects appears here once minted
                on Story Protocol.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/projects">
                  <Film />
                  Create a project
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/datasets">
                  <Database />
                  Browse datasets
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No matching IP assets</CardTitle>
              <CardDescription>
                Try a different search, or clear your filter to see everything.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setQuery("")}>
                <XCircle />
                Clear search
              </Button>
              <Button asChild variant="outline">
                <Link href="/datasets">
                  <Database />
                  Explore datasets
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => (
              <IpAssetCard key={asset.ipId} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

