import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TextElement,
  MediaFile,
  ActiveElement,
  ExportConfig,
  ProjectState,
  ProjectHistoryEntry,
  ProjectExport,
  ProjectPublishRecord,
  RenderEngine,
  TimelineTrack,
  TrackKind,
} from "../../types";

const MAX_HISTORY = 50;

const createTrack = (kind: TrackKind, index: number): TimelineTrack => ({
  id: crypto.randomUUID(),
  kind,
  name: `${kind === "video" ? "V" : "A"}${index}`,
});

const normalizeTracks = (value: unknown): TimelineTrack[] => {
  const raw = Array.isArray(value) ? (value as TimelineTrack[]) : [];
  const tracks = raw.filter(
    (track) =>
      track &&
      typeof track === "object" &&
      (track.kind === "video" || track.kind === "audio") &&
      typeof track.id === "string" &&
      typeof track.name === "string",
  );

  const videoTracks = tracks.filter((t) => t.kind === "video");
  const audioTracks = tracks.filter((t) => t.kind === "audio");

  const normalizedVideos =
    videoTracks.length >= 2
      ? videoTracks
      : [...videoTracks, ...Array.from({ length: 2 - videoTracks.length }, (_, i) => createTrack("video", videoTracks.length + i + 1))];

  const normalizedAudios =
    audioTracks.length > 0 ? audioTracks : [createTrack("audio", 1)];

  return [...normalizedVideos, ...normalizedAudios];
};

const pickDefaultTrackId = (tracks: TimelineTrack[], kind: TrackKind) => {
  const track = tracks.find((t) => t.kind === kind);
  return track?.id ?? null;
};

const pickOverlayVideoTrackId = (tracks: TimelineTrack[]) => {
  const videoTracks = tracks.filter((t) => t.kind === "video");
  return videoTracks[1]?.id ?? videoTracks[0]?.id ?? null;
};

const defaultExportSettings: ExportConfig = {
  resolution: "1080p",
  quality: "high",
  speed: "fastest",
  fps: 30,
  format: "mp4",
  includeSubtitles: false,
  renderEngine: "ffmpeg",
};

export const createProjectState = (
  overrides: Partial<ProjectState> = {},
): ProjectState => {
  const { exportSettings: exportSettingsOverrides, ...restOverrides } =
    overrides;
  const now = new Date().toISOString();
  const next: ProjectState = {
    id: crypto.randomUUID(),
    projectName: "",
    createdAt: now,
    lastModified: now,
    mediaFiles: [],
    textElements: [],
    tracks: normalizeTracks(undefined),
    exports: [],
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
    ...restOverrides,
    exportSettings: {
      ...defaultExportSettings,
      ...(exportSettingsOverrides ?? {}),
    },
  };
  next.tracks = normalizeTracks(next.tracks);
  return next;
};

const snapshotState = (state: ProjectState): ProjectHistoryEntry => {
  const { history, future, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
};

const pushHistory = (state: ProjectState) => {
  const snap = snapshotState(state);
  state.history = [...state.history, snap].slice(-MAX_HISTORY);
  state.future = [];
  state.lastModified = new Date().toISOString();
};

export const initialState: ProjectState = createProjectState();

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
    setTracks: (state, action: PayloadAction<TimelineTrack[]>) => {
      pushHistory(state);
      state.tracks = normalizeTracks(action.payload);
    },
    addTrack: (state, action: PayloadAction<{ kind: TrackKind }>) => {
      pushHistory(state);
      const { kind } = action.payload;
      const existingOfKind = state.tracks.filter((t) => t.kind === kind);
      const nextIndex = existingOfKind.length + 1;
      const nextTrack = createTrack(kind, nextIndex);

      if (kind === "video") {
        const insertAt = state.tracks.filter((t) => t.kind === "video").length;
        state.tracks.splice(insertAt, 0, nextTrack);
        return;
      }

      state.tracks.push(nextTrack);
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
    addExport: (state, action: PayloadAction<ProjectExport>) => {
      pushHistory(state);
      state.exports = [action.payload, ...state.exports];
    },
    deleteExport: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exports = state.exports.filter((exp) => exp.id !== action.payload);
    },
    attachPublishToExport: (
      state,
      action: PayloadAction<{ exportId: string; publish: ProjectPublishRecord }>,
    ) => {
      pushHistory(state);
      const exp = state.exports.find((e) => e.id === action.payload.exportId);
      if (!exp) return;
      exp.publish = action.payload.publish;
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

      next.tracks = normalizeTracks((action.payload as any).tracks);

      const defaultVideoTrackId = pickDefaultTrackId(next.tracks, "video");
      const overlayVideoTrackId = pickOverlayVideoTrackId(next.tracks);
      const defaultAudioTrackId = pickDefaultTrackId(next.tracks, "audio");

      if (defaultVideoTrackId) {
        next.mediaFiles = next.mediaFiles.map((clip) => {
          if (clip.trackId) return clip;
          const trackId =
            clip.type === "audio"
              ? defaultAudioTrackId ?? defaultVideoTrackId
              : clip.type === "image"
                ? overlayVideoTrackId ?? defaultVideoTrackId
                : defaultVideoTrackId;
          return { ...clip, trackId };
        });
      }

      if (overlayVideoTrackId) {
        next.textElements = next.textElements.map((clip) =>
          clip.trackId ? clip : { ...clip, trackId: overlayVideoTrackId },
        );
      }

      next.exports = next.exports.map((exp) => {
        const publish = exp.publish as any;
        if (!publish || typeof publish !== "object") return exp;
        if (typeof publish.videoUrl === "string") return exp;

        const legacyVideo = publish.video as any;
        if (
          !legacyVideo ||
          typeof legacyVideo !== "object" ||
          (typeof legacyVideo.ipfsUri !== "string" &&
            typeof legacyVideo.gatewayUrl !== "string")
        ) {
          return exp;
        }

        const legacyThumb = publish.thumbnail as any;
        const migrated: ProjectPublishRecord = {
          ipId: String(publish.ipId ?? ""),
          licenseTermsId:
            typeof publish.licenseTermsId === "string"
              ? publish.licenseTermsId
              : undefined,
          txHash: typeof publish.txHash === "string" ? publish.txHash : undefined,
          title: String(publish.title ?? ""),
          summary: String(publish.summary ?? ""),
          terms: String(publish.terms ?? ""),
          videoUrl:
            typeof legacyVideo.ipfsUri === "string"
              ? legacyVideo.ipfsUri
              : legacyVideo.gatewayUrl,
          thumbnailUrl:
            legacyThumb && typeof legacyThumb === "object"
              ? typeof legacyThumb.ipfsUri === "string"
                ? legacyThumb.ipfsUri
                : typeof legacyThumb.gatewayUrl === "string"
                  ? legacyThumb.gatewayUrl
                  : undefined
              : undefined,
          ipMetadataUri: String(publish.ipMetadataUri ?? ""),
          nftMetadataUri: String(publish.nftMetadataUri ?? ""),
          createdAt: String(publish.createdAt ?? new Date().toISOString()),
        };

        return { ...exp, publish: migrated };
      });
      return next;
    },
    createNewProject: (state) => {
      return createProjectState();
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
  setTracks,
  addTrack,
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
  addExport,
  deleteExport,
  attachPublishToExport,
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
