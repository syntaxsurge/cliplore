import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TextElement,
  MediaFile,
  ActiveElement,
  ExportConfig,
  ProjectState,
  ProjectHistoryEntry,
  RenderEngine,
} from "../../types";

const MAX_HISTORY = 50;

const snapshotState = (state: ProjectState): ProjectHistoryEntry => {
  const { history, future, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
};

const pushHistory = (state: ProjectState) => {
  const snap = snapshotState(state);
  state.history = [...state.history, snap].slice(-MAX_HISTORY);
  state.future = [];
};

export const initialState: ProjectState = {
  id: crypto.randomUUID(),
  projectName: "",
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  mediaFiles: [],
  textElements: [],
  currentTime: 0,
  isPlaying: false,
  isMuted: false,
  duration: 0,
  filesID: [],
  zoomLevel: 1,
  timelineZoom: 100,
  enableMarkerTracking: true,
  activeSection: "media",
  activeElement: null,
  activeElementIndex: 0,
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  aspectRatio: "16:9",
  history: [],
  future: [],
  exportSettings: {
    resolution: "1080p",
    quality: "high",
    speed: "fastest",
    fps: 30,
    format: "mp4",
    includeSubtitles: false,
    renderEngine: "ffmpeg",
  },
};

const calculateTotalDuration = (
  mediaFiles: MediaFile[],
  textElements: TextElement[],
): number => {
  const mediaDurations = mediaFiles.map((v) => v.positionEnd);
  const textDurations = textElements.map((v) => v.positionEnd);
  return Math.max(0, ...mediaDurations, ...textDurations);
};

const projectStateSlice = createSlice({
  name: "projectState",
  initialState,
  reducers: {
    setMediaFiles: (state, action: PayloadAction<MediaFile[]>) => {
      pushHistory(state);
      state.mediaFiles = action.payload;
      // Calculate duration based on the last video's end time
      state.duration = calculateTotalDuration(
        state.mediaFiles,
        state.textElements,
      );
    },
    setProjectName: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.projectName = action.payload;
    },
    setProjectId: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.id = action.payload;
    },
    setProjectCreatedAt: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.createdAt = action.payload;
    },
    setProjectLastModified: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.lastModified = action.payload;
    },

    setTextElements: (state, action: PayloadAction<TextElement[]>) => {
      pushHistory(state);
      state.textElements = action.payload;
      state.duration = calculateTotalDuration(
        state.mediaFiles,
        state.textElements,
      );
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      pushHistory(state);
      state.isMuted = action.payload;
    },
    setActiveSection: (state, action: PayloadAction<ActiveElement>) => {
      state.activeSection = action.payload;
    },
    setActiveElement: (state, action: PayloadAction<ActiveElement | null>) => {
      state.activeElement = action.payload;
    },
    setActiveElementIndex: (state, action: PayloadAction<number>) => {
      state.activeElementIndex = action.payload;
    },
    setFilesID: (state, action: PayloadAction<string[]>) => {
      pushHistory(state);
      state.filesID = action.payload;
    },
    setExportSettings: (state, action: PayloadAction<ExportConfig>) => {
      pushHistory(state);
      state.exportSettings = action.payload;
    },
    setResolution: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exportSettings.resolution = action.payload;
    },
    setQuality: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exportSettings.quality = action.payload;
    },
    setSpeed: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exportSettings.speed = action.payload;
    },
    setFps: (state, action: PayloadAction<number>) => {
      pushHistory(state);
      state.exportSettings.fps = action.payload;
    },
    setRenderEngine: (state, action: PayloadAction<RenderEngine>) => {
      pushHistory(state);
      state.exportSettings.renderEngine = action.payload;
    },
    setTimelineZoom: (state, action: PayloadAction<number>) => {
      pushHistory(state);
      state.timelineZoom = action.payload;
    },
    setMarkerTrack: (state, action: PayloadAction<boolean>) => {
      pushHistory(state);
      state.enableMarkerTracking = action.payload;
    },
    // Special reducer for rehydrating state from IndexedDB
    rehydrate: (state, action: PayloadAction<ProjectState>) => {
      const next = { ...state, ...action.payload };
      next.exportSettings = {
        ...state.exportSettings,
        ...action.payload.exportSettings,
      };
      return next;
    },
    createNewProject: (state) => {
      return { ...initialState };
    },
    undoState: (state) => {
      const last = state.history[state.history.length - 1];
      if (!last) return;
      const currentSnap = snapshotState(state);
      state.future = [currentSnap, ...state.future].slice(0, MAX_HISTORY);
      state.history = state.history.slice(0, -1);
      Object.assign(state, {
        ...last,
        history: state.history,
        future: state.future,
      });
    },
    redoState: (state) => {
      const next = state.future[0];
      if (!next) return;
      const currentSnap = snapshotState(state);
      state.history = [...state.history, currentSnap].slice(-MAX_HISTORY);
      state.future = state.future.slice(1);
      Object.assign(state, {
        ...next,
        history: state.history,
        future: state.future,
      });
    },
  },
});

export const {
  setMediaFiles,
  setTextElements,
  setCurrentTime,
  setProjectName,
  setIsPlaying,
  setFilesID,
  setExportSettings,
  setResolution,
  setQuality,
  setSpeed,
  setFps,
  setRenderEngine,
  setMarkerTrack,
  setIsMuted,
  setActiveSection,
  setActiveElement,
  setActiveElementIndex,
  setTimelineZoom,
  rehydrate,
  createNewProject,
  undoState,
  redoState,
} = projectStateSlice.actions;

export default projectStateSlice.reducer;
