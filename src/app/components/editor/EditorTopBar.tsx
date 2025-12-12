"use client";

import Link from "next/link";
import { useAppDispatch } from "@/app/store";
import {
  redoState,
  setActiveSection,
  undoState,
} from "@/app/store/slices/projectSlice";
import { Button } from "@/components/ui/button";
import ProjectName from "./player/ProjectName";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Coins,
  Download,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  ShieldCheck,
  Undo2,
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

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/70 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <ProjectName compact className="max-w-[260px]" />
      </div>

      <div className="flex items-center gap-1">
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
        <div className="mx-1 h-5 w-px bg-white/10" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Open publish menu"
            >
              <MoreVertical className="h-4 w-4" />
              Publish
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[190px]">
            <DropdownMenuItem
              onSelect={() => dispatch(setActiveSection("export"))}
            >
              <Download className="h-4 w-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/ip`}>
                <ShieldCheck className="h-4 w-4" />
                Register IP
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/monetization`}>
                <Coins className="h-4 w-4" />
                Monetize
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
