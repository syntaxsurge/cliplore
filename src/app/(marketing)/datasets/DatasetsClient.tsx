"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Database, Filter, Film, PlusCircle, Search, XCircle } from "lucide-react";
import DatasetCard from "./DatasetCard";
import type { DatasetMarketplaceAsset } from "./types";

type SortKey = "newest" | "oldest";

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function toDatasetTypeKey(value: string) {
  return value.trim().toLowerCase();
}

function sortDatasets(datasets: DatasetMarketplaceAsset[], sortKey: SortKey) {
  return [...datasets].sort((a, b) => {
    const aValue = a.updatedAt ?? a.createdAt;
    const bValue = b.updatedAt ?? b.createdAt;
    return sortKey === "newest" ? bValue - aValue : aValue - bValue;
  });
}

export default function DatasetsClient(props: {
  initialDatasets: DatasetMarketplaceAsset[];
  hadError: boolean;
}) {
  const { initialDatasets, hadError } = props;
  const [query, setQuery] = useState("");
  const [datasetType, setDatasetType] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const datasetTypeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const dataset of initialDatasets) {
      if (!dataset.datasetType) continue;
      const key = toDatasetTypeKey(dataset.datasetType);
      if (!seen.has(key)) {
        seen.set(key, dataset.datasetType);
      }
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [initialDatasets]);

  const normalizedQuery = normalizeQuery(query);

  const filteredDatasets = useMemo(() => {
    let out = initialDatasets;

    if (datasetType !== "all") {
      out = out.filter((dataset) => {
        const value = dataset.datasetType ? toDatasetTypeKey(dataset.datasetType) : "";
        return value === datasetType;
      });
    }

    if (normalizedQuery) {
      out = out.filter((dataset) => {
        const haystack = [
          dataset.title,
          dataset.summary,
          dataset.terms,
          dataset.ipId,
          dataset.licensorWallet,
          dataset.datasetType ?? "",
          dataset.mediaMimeType ?? "",
          ...(dataset.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
    }

    return sortDatasets(out, sortKey);
  }, [datasetType, initialDatasets, normalizedQuery, sortKey]);

  const hasDatasets = initialDatasets.length > 0;
  const hasQuery = normalizedQuery.length > 0;
  const showEmptyResults = hasDatasets && filteredDatasets.length === 0;

  const datasetTypeLabel =
    datasetType === "all"
      ? "All dataset types"
      : datasetTypeOptions.find((option) => option.key === datasetType)?.label ??
        "Filtered";

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Data track</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Datasets
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              Rights-cleared real-world samples registered as Story IP Assets with
              explicit licensing terms. Filter by dataset type, tags, or creator wallet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/datasets/new">
                <PlusCircle />
                Publish a dataset
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/explore">
                <Film />
                Explore videos
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
                  placeholder="Search title, tags, wallet, IP Asset ID, or license terms…"
                  className="pl-9"
                  aria-label="Search datasets"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hadError ? <Badge variant="warning">Marketplace degraded</Badge> : null}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter />
                      {datasetTypeLabel}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Dataset type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={datasetType}
                      onValueChange={(value) => setDatasetType(value)}
                    >
                      <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                      {datasetTypeOptions.map((option) => (
                        <DropdownMenuRadioItem key={option.key} value={option.key}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Sort</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortKey}
                      onValueChange={(value) => setSortKey(value as SortKey)}
                    >
                      <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Badge variant="outline" className="tabular-nums">
                  {filteredDatasets.length}{" "}
                  {filteredDatasets.length === 1 ? "result" : "results"}
                </Badge>

                {hasQuery || datasetType !== "all" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setDatasetType("all");
                    }}
                  >
                    <XCircle />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {hadError && !hasDatasets ? (
          <Card>
            <CardHeader>
              <CardTitle>Marketplace temporarily unavailable</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/datasets">
                  <Database />
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
        ) : !hasDatasets ? (
          <Card>
            <CardHeader>
              <CardTitle>No datasets yet</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/datasets/new">
                  <PlusCircle />
                  Publish a dataset
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
        ) : showEmptyResults ? (
          <Card>
            <CardHeader>
              <CardTitle>No matching datasets</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setDatasetType("all");
                }}
              >
                <XCircle />
                Clear filters
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">
                  <Film />
                  Explore videos
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDatasets.map((dataset) => (
              <DatasetCard key={dataset.ipId} dataset={dataset} />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

