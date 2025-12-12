"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import AddMedia from "../../../components/editor/AssetsPanel/AddButtons/UploadMedia";
import MediaList from "../../../components/editor/AssetsPanel/tools-section/MediaList";
import TextButton from "@/app/components/editor/AssetsPanel/SidebarButtons/TextButton";
import LibraryButton from "@/app/components/editor/AssetsPanel/SidebarButtons/LibraryButton";
import ExportButton from "@/app/components/editor/AssetsPanel/SidebarButtons/ExportButton";
import HomeButton from "@/app/components/editor/AssetsPanel/SidebarButtons/HomeButton";
import MediaProperties from "../../../components/editor/PropertiesSection/MediaProperties";
import TextProperties from "../../../components/editor/PropertiesSection/TextProperties";
import { Timeline } from "../../../components/editor/timeline/Timline";
import { PreviewPlayer } from "../../../components/editor/player/remotion/Player";
import { MediaFile } from "@/app/types";
import ExportList from "../../../components/editor/AssetsPanel/tools-section/ExportList";
import { SoraPanel } from "../../../components/editor/AssetsPanel/tools-section/SoraPanel";
import EditorTopBar from "@/app/components/editor/EditorTopBar";
import { Image as ImageIcon, Music, Type, Video } from "lucide-react";

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
  const router = useRouter();
  const { activeSection, activeElement } = projectState;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;
    if (isMobile) {
      setShowAssets(false);
      setShowProperties(false);
    }
  }, []);

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
    dispatch(setActiveSection(section));
  };

  return (
    <div className="flex flex-col h-screen select-none">
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
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        <div className="w-full flex flex-row justify-center gap-3 border-b border-gray-800 lg:border-b-0 lg:flex-[0.1] lg:min-w-[60px] lg:max-w-[100px] lg:border-r lg:border-gray-700 lg:overflow-y-auto p-4">
          <div className="flex flex-row space-x-2 lg:flex-col lg:space-x-0 lg:space-y-2">
            <HomeButton />
            <TextButton
              active={activeSection === "text"}
              onClick={() => handleFocus("text")}
            />
            <LibraryButton
              active={activeSection === "media"}
              onClick={() => handleFocus("media")}
            />
            <ExportButton
              active={activeSection === "export"}
              onClick={() => handleFocus("export")}
            />
          </div>
        </div>

        {showAssets && (
          <div className="w-full max-h-[40vh] overflow-y-auto border-b border-gray-800 lg:max-h-none lg:flex-[0.3] lg:min-w-[200px] lg:border-b-0 lg:border-r lg:border-gray-800 p-4">
            {activeSection === "media" && (
              <div>
                <SoraPanel />
                <div className="h-3" />
                <h2 className="text-lg flex flex-row gap-2 items-center justify-center font-semibold mb-2">
                  <AddMedia />
                </h2>
                <MediaList />
              </div>
            )}
            {activeSection === "text" && (
              <div>
                <AddText />
              </div>
            )}
            {activeSection === "export" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Export</h2>
                <ExportList />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center flex-col flex-[1] overflow-hidden min-h-[40vh] lg:min-h-0">
          <PreviewPlayer />
        </div>

        {showProperties && (
          <div className="w-full max-h-[40vh] overflow-y-auto border-t border-gray-800 lg:max-h-none lg:flex-[0.4] lg:min-w-[200px] lg:border-t-0 lg:border-l lg:border-gray-800 p-4">
            {activeElement === "media" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Media Properties</h2>
                <MediaProperties />
              </div>
            )}
            {activeElement === "text" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Text Properties</h2>
                <TextProperties />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-row border-t border-gray-500">
        <div className=" bg-darkSurfacePrimary flex flex-col items-center justify-center mt-2 lg:mt-20">
          <div className="relative h-16">
            <div className="flex items-center gap-2 p-4">
              <Video className="h-6 w-6 text-white/70" aria-hidden="true" />
            </div>
          </div>

          <div className="relative h-16">
            <div className="flex items-center gap-2 p-4">
              <Music className="h-6 w-6 text-white/70" aria-hidden="true" />
            </div>
          </div>

          <div className="relative h-16">
            <div className="flex items-center gap-2 p-4">
              <ImageIcon className="h-6 w-6 text-white/70" aria-hidden="true" />
            </div>
          </div>

          <div className="relative h-16">
            <div className="flex items-center gap-2 p-4">
              <Type className="h-6 w-6 text-white/70" aria-hidden="true" />
            </div>
          </div>
        </div>
        <Timeline />
      </div>
    </div>
  );
}
