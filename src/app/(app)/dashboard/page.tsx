"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchConvexProjects, fetchConvexStats } from "@/lib/api/convex";
import { listProjects } from "@/app/store";
import { ProjectState } from "@/app/types";

type Stats = {
  projects: number;
  assets: number;
  ipAssets: number;
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const localProjects = await listProjects();
        setProjects(localProjects);

        if (address) {
          const [{ stats }, { projects }] = await Promise.all([
            fetchConvexStats(address),
            fetchConvexProjects(address),
          ]);
          setStats(stats);

          // Merge remote metadata titles into local projects if missing
          if (projects?.length) {
            setProjects((prev) =>
              prev.map((p) => {
                const match = projects.find((rp: any) => rp.id === p.id);
                if (match && match.title !== p.projectName) {
                  return { ...p, projectName: match.title };
                }
                return p;
              }),
            );
          }
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  const walletLabel = useMemo(() => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Creator workspace</p>
          <h1 className="text-4xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Launch projects, track IP registrations, and see your on-chain
            licensing footprint.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? "success" : "warning"}>
            {walletLabel}
          </Badge>
          <Button
            variant="secondary"
            onClick={() => openConnectModal?.()}
            className="min-w-[140px]"
          >
            {isConnected ? "Switch wallet" : "Connect wallet"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {stats ? stats.projects : projects.length}
            </p>
            <p className="text-sm text-muted-foreground">Tracked in Convex</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats ? stats.assets : 0}</p>
            <p className="text-sm text-muted-foreground">
              Stored & ready to edit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>IP on Story</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {stats ? stats.ipAssets : 0}
            </p>
            <p className="text-sm text-muted-foreground">
              Registered with PIL terms
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent projects</CardTitle>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/projects">Open projects</Link>
              </Button>
              <Button asChild>
                <Link href="/projects">New project</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {error} — confirm NEXT_PUBLIC_CONVEX_URL points to your
              deployment.
            </p>
          )}
          {!loading && projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No projects yet. Start from a template or create a new timeline.
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {projects
              .sort(
                (a, b) =>
                  new Date(b.lastModified).getTime() -
                  new Date(a.lastModified).getTime(),
              )
              .slice(0, 4)
              .map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-border bg-muted/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-lg font-semibold text-foreground">
                      {project.projectName}
                    </h3>
                    <Badge variant="outline">Local draft</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Updated{" "}
                    {new Date(project.lastModified).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/projects/${project.id}`}>Open editor</Link>
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
