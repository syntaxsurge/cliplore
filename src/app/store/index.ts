"use client";
import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import projectStateReducer from "./slices/projectSlice";
import projectsReducer from "./slices/projectsSlice";
import toast from "react-hot-toast";

// Create IndexedDB database for files and projects
const setupDB = async () => {
  if (typeof window === "undefined") return null;
  const idb = await import("idb");
  const db = await idb.openDB("cliplore-files", 1, {
    upgrade(db) {
      db.createObjectStore("files", { keyPath: "id" });
      db.createObjectStore("projects", { keyPath: "id" });
    },
  });
  return db;
};

// Load state from localStorage
export const loadState = () => {
  if (typeof window === "undefined") return undefined;
  try {
    const serializedState = localStorage.getItem("cliplore-state");
    if (serializedState === null) return undefined;
    return JSON.parse(serializedState);
  } catch (error) {
    toast.error("Error loading state from localStorage");
    console.error("Error loading state from localStorage:", error);
    return undefined;
  }
};

// Save state to localStorage
const saveState = (state: any) => {
  if (typeof window === "undefined") return;
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem("cliplore-state", serializedState);
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
};

// File storage functions
export const storeFile = async (file: File, fileId: string) => {
  if (typeof window === "undefined") return null;
  try {
    const db = await setupDB();
    if (!db) return null;

    const fileData = {
      id: fileId,
      file: file,
    };

    await db.put("files", fileData);
    return fileId;
  } catch (error) {
    toast.error("Error storing file");
    console.error("Error storing file:", error);
    return null;
  }
};

export const getFile = async (fileId: string) => {
  if (typeof window === "undefined") return null;
  try {
    const db = await setupDB();
    if (!db) return null;

    const fileData = await db.get("files", fileId);
    if (!fileData) return null;

    return fileData.file;
  } catch (error) {
    toast.error("Error retrieving file");
    console.error("Error retrieving file:", error);
    return null;
  }
};

export const deleteFile = async (fileId: string) => {
  if (typeof window === "undefined") return;
  try {
    const db = await setupDB();
    if (!db) return;
    await db.delete("files", fileId);
  } catch (error) {
    toast.error("Error deleting file");
    console.error("Error deleting file:", error);
  }
};

export const listFiles = async () => {
  if (typeof window === "undefined") return [];
  try {
    const db = await setupDB();
    if (!db) return [];
    return await db.getAll("files");
  } catch (error) {
    toast.error("Error listing files");
    console.error("Error listing files:", error);
    return [];
  }
};

const stripMediaSrc = (media: any) => {
  if (!media || typeof media !== "object") return media;
  const { src: _src, ...rest } = media;
  return rest;
};

const sanitizeProjectForStorage = (project: any) => {
  if (!project || typeof project !== "object") return project;

  const sanitized = { ...project };

  if (Array.isArray(sanitized.mediaFiles)) {
    sanitized.mediaFiles = sanitized.mediaFiles.map(stripMediaSrc);
  }

  if (Array.isArray(sanitized.history)) {
    sanitized.history = sanitized.history.map((entry: any) => {
      if (!entry || typeof entry !== "object") return entry;
      const nextEntry = { ...entry };
      if (Array.isArray(nextEntry.mediaFiles)) {
        nextEntry.mediaFiles = nextEntry.mediaFiles.map(stripMediaSrc);
      }
      return nextEntry;
    });
  }

  if (Array.isArray(sanitized.future)) {
    sanitized.future = sanitized.future.map((entry: any) => {
      if (!entry || typeof entry !== "object") return entry;
      const nextEntry = { ...entry };
      if (Array.isArray(nextEntry.mediaFiles)) {
        nextEntry.mediaFiles = nextEntry.mediaFiles.map(stripMediaSrc);
      }
      return nextEntry;
    });
  }

  return sanitized;
};

// Project storage functions
export const storeProject = async (project: any) => {
  if (typeof window === "undefined") return null;
  try {
    const db = await setupDB();

    if (!db) return null;
    if (!project.id || !project.projectName) {
      return null;
    }

    await db.put("projects", sanitizeProjectForStorage(project));

    return project.id;
  } catch (error) {
    toast.error("Error storing project");
    console.error("Error storing project:", error);
    return null;
  }
};

export const getProject = async (projectId: string) => {
  if (typeof window === "undefined") return null;
  try {
    const db = await setupDB();
    if (!db) return null;
    const project = await db.get("projects", projectId);
    return project ? sanitizeProjectForStorage(project) : null;
  } catch (error) {
    toast.error("Error retrieving project");
    console.error("Error retrieving project:", error);
    return null;
  }
};

export const deleteProject = async (projectId: string) => {
  if (typeof window === "undefined") return;
  try {
    const db = await setupDB();
    if (!db) return;
    await db.delete("projects", projectId);
  } catch (error) {
    toast.error("Error deleting project");
    console.error("Error deleting project:", error);
  }
};

export const listProjects = async () => {
  if (typeof window === "undefined") return [];
  try {
    const db = await setupDB();
    if (!db) return [];
    const projects = await db.getAll("projects");
    return Array.isArray(projects)
      ? projects.map((project) => sanitizeProjectForStorage(project))
      : [];
  } catch (error) {
    console.error("Error listing projects:", error);
    return [];
  }
};

type StoredProjectBundle = {
  project: any;
  files: {
    id: string;
    name: string;
    type: string;
    base64: string;
  }[];
};

const fileToBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
};

const base64ToFile = (base64: string, name: string, type: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type });
};

export const exportProjectBundle = async (
  projectId: string,
): Promise<StoredProjectBundle | null> => {
  if (typeof window === "undefined") return null;
  const project = await getProject(projectId);
  if (!project) return null;

  const files: StoredProjectBundle["files"] = [];
  for (const fileId of project.filesID || []) {
    const file = await getFile(fileId);
    if (!file) continue;
    const base64 = await fileToBase64(file);
    files.push({
      id: fileId,
      name: file.name,
      type: file.type,
      base64,
    });
  }

  const sanitizedProject = {
    ...project,
    mediaFiles:
      project.mediaFiles?.map((media: any) => {
        const { src, ...rest } = media;
        return rest;
      }) ?? [],
  };

  return {
    project: sanitizedProject,
    files,
  };
};

export const importProjectBundle = async (bundle: StoredProjectBundle) => {
  if (typeof window === "undefined") return null;
  if (!bundle?.project) return null;

  const now = new Date().toISOString();
  const fileIdMap = new Map<string, string>();

  for (const file of bundle.files || []) {
    const newId = crypto.randomUUID();
    const reconstructed = base64ToFile(file.base64, file.name, file.type);
    await storeFile(reconstructed, newId);
    fileIdMap.set(file.id, newId);
  }

  const newProjectId = crypto.randomUUID();
  const clonedMedia = (bundle.project.mediaFiles || []).map((media: any) => {
    const updatedFileId = fileIdMap.get(media.fileId) ?? media.fileId;
    return {
      ...media,
      id: crypto.randomUUID(),
      fileId: updatedFileId,
      src: undefined,
    };
  });

  const importedProject = {
    ...bundle.project,
    id: newProjectId,
    projectName:
      bundle.project.projectName ||
      `Imported Project ${new Date().toLocaleString()}`,
    createdAt: now,
    lastModified: now,
    mediaFiles: clonedMedia,
    filesID: Array.from(fileIdMap.values()),
  };

  await storeProject(importedProject);
  return importedProject;
};

export const store = configureStore({
  reducer: {
    projectState: projectStateReducer,
    projects: projectsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// TODO: remove old state (localStorage we use indexedDB now) that is not used anymore

// Load persisted state from localStorage
// const persistedState = loadState();
// if (persistedState) {
//     store.dispatch({
//         type: 'REPLACE_STATE',
//         payload: persistedState
//     });
// }

// TODO: for some reason state get saved to localStorage twice when its none cause loss of old state i shall find better way to do this later
// Subscribe to store changes to save to localStorage
// if (typeof window !== 'undefined') {
//     let isInitial = 2;
//     store.subscribe(() => {
//         if (isInitial) {
//             isInitial -= 1;
//             return;
//         }

//         const state = store.getState();
//         saveState(state);
//     });
// }

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
