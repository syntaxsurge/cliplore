"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  addProject,
  deleteProject,
  rehydrateProjects,
  setCurrentProject,
} from "../../store/slices/projectsSlice";
import {
  listProjects,
  storeProject,
  deleteProject as deleteProjectFromDB,
  exportProjectBundle,
  importProjectBundle,
} from "../../store";
import { ProjectState } from "../../types";
import { toast } from "react-hot-toast";
import { createConvexProject } from "@/lib/api/convex";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Film, PlusCircle, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProjectState } from "@/app/store/slices/projectSlice";
export default function Projects() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { projects, currentProjectId } = useAppSelector(
    (state) => state.projects,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    if (!address) {
      toast.error("Connect a wallet to create a project.");
      return;
    }

    const newProject: ProjectState = createProjectState({
      projectName: newProjectName,
    });

    await storeProject(newProject);
    dispatch(addProject(newProject));
    try {
      await createConvexProject({
        wallet: address,
        title: newProjectName,
        localId: newProject.id,
      });
    } catch {
      toast.error("Cloud sync failed. Your project is still saved locally.");
    }
    setNewProjectName("");
    setIsCreating(false);
    toast.success("Project created successfully");
  };

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const storedProjects = await listProjects();
        dispatch(rehydrateProjects(storedProjects));
      } catch (error) {
        toast.error("Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [dispatch]);

  useEffect(() => {
    const parentIp = searchParams.get("parentIp");
    if (parentIp && !isCreating && !newProjectName) {
      setNewProjectName(`Remix of ${parentIp}`);
      setIsCreating(true);
    }
  }, [searchParams, isCreating, newProjectName]);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleExportProject = async (projectId: string, name: string) => {
    try {
      const bundle = await exportProjectBundle(projectId);
      if (!bundle) {
        toast.error("Could not export project");
        return;
      }
      const blob = new Blob([JSON.stringify(bundle)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name || "cliplore-project"}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Project exported");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export project");
    }
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const imported = await importProjectBundle(bundle);
      if (!imported) throw new Error("Invalid project bundle");
      const refreshed = await listProjects();
      dispatch(rehydrateProjects(refreshed));
      toast.success(`Imported project "${imported.projectName}"`);
    } catch (error) {
      console.error("Import failed", error);
      toast.error("Could not import project");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProjectFromDB(projectId);
    dispatch(deleteProject(projectId));
    const storedProjects = await listProjects();
    dispatch(rehydrateProjects(storedProjects));
    toast.success("Project deleted successfully");
  };

  const sortedProjects = [...projects].sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Creator workspace</p>
          <h1 className="text-4xl font-semibold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            Start a new timeline, remix an IP asset, or continue a draft.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreating(true)}>
                <PlusCircle className="h-4 w-4" />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create new project</DialogTitle>
                <DialogDescription>
                  Give your timeline a short, memorable title.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="newProjectName">Project name</Label>
                <Input
                  id="newProjectName"
                  ref={inputRef}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleCreateProject();
                    } else if (e.key === "Escape") {
                      setIsCreating(false);
                    }
                  }}
                  placeholder="Project title"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleCreateProject()}
                  disabled={!newProjectName.trim()}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isImporting}
          >
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" />
              {isImporting ? "Importing…" : "Import project"}
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
                disabled={isImporting}
              />
            </label>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && sortedProjects.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Create your first timeline to start editing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreating(true)}>
              <PlusCircle className="h-4 w-4" />
              New project
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && sortedProjects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map(
            ({ id, projectName, createdAt, lastModified }) => (
              <Card
                key={id}
                className={cn(
                  "group relative overflow-hidden transition-colors hover:border-border/80",
                  id === currentProjectId && "border-primary/30",
                )}
              >
                <Link
                  href={`/projects/${id}`}
                  onClick={() => dispatch(setCurrentProject(id))}
                  className="block h-full"
                >
                  <CardHeader className="space-y-1 pr-16">
                    <CardTitle className="flex items-center gap-2 truncate">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      {projectName}
                    </CardTitle>
                    <CardDescription>
                      Updated {new Date(lastModified).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Created {new Date(createdAt).toLocaleDateString()}
                  </CardContent>
                </Link>

                <div className="absolute right-3 top-3 flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Export project"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void handleExportProject(id, projectName);
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete project"
                    className="text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void handleDeleteProject(id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
