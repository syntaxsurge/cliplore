"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  getFile,
  getProject,
  storeProject,
  useAppDispatch,
  useAppSelector,
} from "../../../store";
import {
  setCurrentProject,
  updateProject,
} from "../../../store/slices/projectsSlice";
import {
  rehydrate,
  setMediaFiles,
  setActiveSection,
} from "../../../store/slices/projectSlice";
import AddText from "../../../components/editor/AssetsPanel/tools-section/AddText";
import LibraryPanel from "../../../components/editor/AssetsPanel/tools-section/LibraryPanel";
import TextButton from "@/app/components/editor/AssetsPanel/SidebarButtons/TextButton";
import LibraryButton from "@/app/components/editor/AssetsPanel/SidebarButtons/LibraryButton";
import ExportButton from "@/app/components/editor/AssetsPanel/SidebarButtons/ExportButton";
import MediaProperties from "../../../components/editor/PropertiesSection/MediaProperties";
import TextProperties from "../../../components/editor/PropertiesSection/TextProperties";
import { Timeline } from "../../../components/editor/timeline/Timline";
import { PreviewPlayer } from "../../../components/editor/player/remotion/Player";
import type { ActiveElement, MediaFile } from "@/app/types";
import ExportList from "../../../components/editor/AssetsPanel/tools-section/ExportList";
import EditorTopBar from "@/app/components/editor/EditorTopBar";
import { EditorPlayerProvider } from "@/app/components/editor/player/remotion/EditorPlayerContext";
import { SoraJobManager } from "@/app/components/editor/AssetsPanel/tools-section/SoraJobManager";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type Props = {
  projectId: string;
};

export default function ProjectClient({ projectId }: Props) {
  const dispatch = useAppDispatch();
  const projectState = useAppSelector((state) => state.projectState);
  const { currentProjectId } = useAppSelector((state) => state.projects);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [lastAssetsSection, setLastAssetsSection] =
    useState<Exclude<ActiveElement, null>>("media");
  const router = useRouter();
  const { activeSection, activeElement } = projectState;
  const assetsPanelRef = useRef<ImperativePanelHandle>(null);
  const propertiesPanelRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;
    if (isMobile) {
      setShowAssets(false);
      setShowProperties(false);
      dispatch(setActiveSection(null));
    }
  }, [dispatch]);

  useEffect(() => {
    if (activeSection) setLastAssetsSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    const panel = assetsPanelRef.current;
    if (!panel) return;
    if (showAssets) {
      panel.expand();
      if (!activeSection) dispatch(setActiveSection(lastAssetsSection));
    } else {
      if (activeSection !== null) dispatch(setActiveSection(null));
      panel.collapse();
    }
  }, [activeSection, dispatch, lastAssetsSection, showAssets]);

  useEffect(() => {
    const panel = propertiesPanelRef.current;
    if (!panel) return;
    if (showProperties) panel.expand();
    else panel.collapse();
  }, [showProperties]);

  useEffect(() => {
    const loadProject = async () => {
      if (projectId) {
        setIsLoading(true);
        const project = await getProject(projectId);
        if (project) {
          dispatch(setCurrentProject(projectId));
          setIsLoading(false);
        } else {
          router.push("/404");
        }
      }
    };
    loadProject();
  }, [projectId, dispatch, router]);

  useEffect(() => {
    const loadProjectState = async () => {
      if (currentProjectId) {
        const project = await getProject(currentProjectId);
        if (project) {
          dispatch(rehydrate(project));

          dispatch(
            setMediaFiles(
              await Promise.all(
                project.mediaFiles.map(async (media: MediaFile) => {
                  const file = await getFile(media.fileId);
                  return { ...media, src: URL.createObjectURL(file) };
                }),
              ),
            ),
          );
        }
      }
    };
    loadProjectState();
  }, [dispatch, currentProjectId]);

  useEffect(() => {
    const saveProject = async () => {
      if (!projectState || projectState.id !== currentProjectId) return;
      await storeProject(projectState);
      dispatch(updateProject(projectState));
    };
    saveProject();
  }, [projectState, dispatch, currentProjectId]);

  const handleFocus = (section: "media" | "text" | "export") => {
    if (!showAssets) setShowAssets(true);
    dispatch(setActiveSection(section));
  };

  return (
    <EditorPlayerProvider>
      <SoraJobManager />
      <div className="flex h-screen flex-col select-none bg-black">
        <EditorTopBar
          projectId={projectId}
          showAssets={showAssets}
          showProperties={showProperties}
          onToggleAssets={() => setShowAssets((v) => !v)}
          onToggleProperties={() => setShowProperties((v) => !v)}
        />
        {isLoading ? (
          <div className="fixed inset-0 flex items-center bg-black bg-opacity-50 justify-center z-50">
            <div className="bg-black bg-opacity-70 p-6 rounded-lg flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-t-white border-r-white border-opacity-30 border-t-opacity-100 rounded-full animate-spin"></div>
              <p className="mt-4 text-white text-lg">Loading project...</p>
            </div>
          </div>
        ) : null}
        <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">
          <ResizablePanel defaultSize={70} minSize={35}>
            <div className="flex h-full w-full overflow-hidden">
              <div className="w-[72px] shrink-0 border-r border-white/10 bg-black/60 p-2">
                <div className="flex flex-col gap-2">
                  <LibraryButton
                    active={showAssets && activeSection === "media"}
                    onClick={() => handleFocus("media")}
                  />
                  <TextButton
                    active={showAssets && activeSection === "text"}
                    onClick={() => handleFocus("text")}
                  />
                  <ExportButton
                    active={showAssets && activeSection === "export"}
                    onClick={() => handleFocus("export")}
                  />
                </div>
              </div>

              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full flex-1 overflow-hidden"
              >
                <ResizablePanel
                  ref={assetsPanelRef}
                  defaultSize={24}
                  minSize={18}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => setShowAssets(false)}
                  onExpand={() => setShowAssets(true)}
                  className="min-w-[280px]"
                >
                  <div className="h-full overflow-y-auto border-r border-white/10 bg-black/40 p-4">
                    {activeSection === "media" ? <LibraryPanel /> : null}

                    {activeSection === "text" ? (
                      <div>
                        <AddText />
                      </div>
                    ) : null}

                    {activeSection === "export" ? (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h2 className="text-sm font-semibold text-white">
                            Export
                          </h2>
                          <p className="text-xs text-white/50">
                            Render a cut, then download or publish it.
                          </p>
                        </div>
                        <ExportList projectId={projectId} />
                      </div>
                    ) : null}

                    {!activeSection ? (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-sm text-white/70">
                          Select a tool from the sidebar.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </ResizablePanel>

                <ResizableHandle
                  withHandle={showAssets}
                  className={showAssets ? undefined : "hidden"}
                />

                <ResizablePanel defaultSize={54} minSize={30}>
                  <div className="h-full w-full overflow-hidden bg-black">
                    <PreviewPlayer />
                  </div>
                </ResizablePanel>

                <ResizableHandle
                  withHandle={showProperties}
                  className={showProperties ? undefined : "hidden"}
                />

                <ResizablePanel
                  ref={propertiesPanelRef}
                  defaultSize={22}
                  minSize={16}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => setShowProperties(false)}
                  onExpand={() => setShowProperties(true)}
                  className="min-w-[280px]"
                >
                  <div className="h-full overflow-y-auto border-l border-white/10 bg-black/40 p-4">
                    {activeElement === "media" ? (
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">
                          Media Properties
                        </h2>
                        <MediaProperties />
                      </div>
                    ) : null}

                    {activeElement === "text" ? (
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">
                          Text Properties
                        </h2>
                        <TextProperties />
                      </div>
                    ) : null}

                    {!activeElement ? (
                      <p className="text-sm text-muted-foreground">
                        Select an element on the timeline to edit its properties.
                      </p>
                    ) : null}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={30} minSize={18}>
            <div className="flex h-full overflow-hidden border-t border-white/10 bg-black">
              <div className="flex-1 overflow-hidden">
                <Timeline />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </EditorPlayerProvider>
  );
}
