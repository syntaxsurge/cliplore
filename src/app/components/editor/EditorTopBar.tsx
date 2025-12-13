"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  redoState,
  setActiveSection,
  undoState,
} from "@/app/store/slices/projectSlice";
import { Button } from "@/components/ui/button";
import ProjectName from "./player/ProjectName";
import {
  ArrowLeft,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";

type Props = {
  projectId: string;
  showAssets: boolean;
  showProperties: boolean;
  onToggleAssets: () => void;
  onToggleProperties: () => void;
};

export default function EditorTopBar({
  projectId,
  showAssets,
  showProperties,
  onToggleAssets,
  onToggleProperties,
}: Props) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const exports = useAppSelector((state) => state.projectState.exports);
  const latestExport = exports[0];
  const canPublish = exports.length > 0;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/70 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAssets}
          aria-label={showAssets ? "Hide assets panel" : "Show assets panel"}
        >
          {showAssets ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <ProjectName compact className="max-w-[260px]" />
        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(undoState())}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(redoState())}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (!showAssets) onToggleAssets();
            dispatch(setActiveSection("export"));
          }}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPublish}
          onClick={() => {
            const exportQuery = latestExport?.id
              ? `?exportId=${encodeURIComponent(latestExport.id)}`
              : "";
            router.push(`/projects/${projectId}/publish${exportQuery}`);
          }}
          aria-disabled={!canPublish}
          aria-label={
            canPublish
              ? "Publish export to Story Protocol"
              : "Export a video before publishing"
          }
        >
          <Upload className="h-4 w-4" />
          Publish
        </Button>
        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleProperties}
          aria-label={
            showProperties ? "Hide properties panel" : "Show properties panel"
          }
        >
          {showProperties ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
