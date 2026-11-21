import { create } from "zustand";
import * as api from "./api";
import { defaultConfig } from "./config";
import { disposeModel, ensureModel, getModel } from "./editor/models";
import { applyEditorFont, applyTheme } from "./theme";
import { emit } from "./bus";
import { detectLanguage } from "./utils/language";
import {
  baseName,
  dirName,
  isSubPath,
  joinPath,
  pathKey,
} from "./utils/path";
import type {
  BottomTab,
  Breakpoint,
  DebugScope,
  DiffData,
  GitCommit,
  GitStatus,
  LspStatus,
  OpenFile,
  OutlineSymbol,
  Problem,
  ProjectInfo,
  SidebarView,
  StackFrame,
  TaskInfo,
  ToastItem,
  WatchItem,
  ZenConfig,
} from "./types";

let taskCounter = 0;
let toastCounter = 0;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem("zenide.recent");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function breakpointStorageKey(workspace: string | null): string {
  return "zenide.breakpoints." + pathKey(workspace ?? "none");
}

function readBreakpoints(workspace: string | null): Breakpoint[] {
  try {
    const raw = localStorage.getItem(breakpointStorageKey(workspace));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.path === "string" &&
          typeof item.line === "number"
      )
      .map((item) => ({ path: item.path, line: item.line }));
  } catch {
    return [];
  }
}

function writeBreakpoints(workspace: string | null, breakpoints: Breakpoint[]) {
  try {
    localStorage.setItem(
      breakpointStorageKey(workspace),
      JSON.stringify(breakpoints)
    );
  } catch {
    // ignore storage errors
  }
}

function cloneConfig(config: ZenConfig): ZenConfig {
  return JSON.parse(JSON.stringify(config)) as ZenConfig;
}

interface AppState {
  ready: boolean;
  workspace: string | null;
  project: ProjectInfo | null;
  config: ZenConfig;
  configPath: string;
  home: string;
  recent: string[];
  openFiles: OpenFile[];
  activeFile: string | null;
  problems: Problem[];
  outline: OutlineSymbol[];
  treeVersion: number;
  sidebarView: SidebarView;
  sidebarVisible: boolean;
  rightPanelVisible: boolean;
  rightView: "outline" | "variables";
  bottomVisible: boolean;
  bottomTab: BottomTab;
  git: GitStatus | null;
  gitBranches: string[];
  gitLog: GitCommit[];
  gitLoading: boolean;
  tasks: TaskInfo[];
  activeTaskId: number | null;
  diff: DiffData | null;
  settingsOpen: boolean;
  newProjectOpen: boolean;
  quickOpenOpen: boolean;
  cursor: { line: number; column: number };
  pendingReveal: { path: string; line: number; column: number } | null;
  toasts: ToastItem[];
  breakpoints: Breakpoint[];
  debugActive: boolean;
  debugPaused: boolean;
  debugThreadId: number | null;
  debugFrames: StackFrame[];
  debugSelectedFrame: number | null;
  debugScopes: DebugScope[];
  debugOutput: string;
  watches: WatchItem[];
  lspStatus: Record<string, LspStatus>;
  pythonPackages: { name: string; version: string }[];
  pythonLoading: boolean;

  bootstrap: () => Promise<void>;
  applyConfig: (config: ZenConfig) => void;
  updateConfig: (config: ZenConfig) => Promise<void>;
  toggleVim: () => Promise<void>;
  setWorkspace: (path: string | null) => Promise<void>;
  refreshProject: () => Promise<void>;
  refreshTree: () => void;
  openFile: (path: string, line?: number, column?: number) => Promise<void>;
  closeFile: (path: string) => Promise<void>;
  closeActive: () => Promise<void>;
  saveFile: (path: string) => Promise<boolean>;
  saveActive: () => Promise<boolean>;
  saveAll: () => Promise<void>;
  markDirty: (path: string) => void;
  setActiveFile: (path: string) => void;
  setCursor: (line: number, column: number) => void;
  setProblemsForFile: (path: string, problems: Problem[]) => void;
  clearProblemsForFile: (path: string) => void;
  setOutline: (symbols: OutlineSymbol[]) => void;
  setSidebarView: (view: SidebarView) => void;
  toggleSidebarView: (view: SidebarView) => void;
  setSidebarVisible: (visible: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  toggleRightPanel: () => void;
  setRightView: (view: "outline" | "variables") => void;
  setBottomVisible: (visible: boolean) => void;
  toggleBottom: (tab?: BottomTab) => void;
  setBottomTab: (tab: BottomTab) => void;
  setDiff: (diff: DiffData | null) => void;
  closeDiff: () => void;
  setSettingsOpen: (open: boolean) => void;
  setNewProjectOpen: (open: boolean) => void;
  setQuickOpenOpen: (open: boolean) => void;
  toast: (message: string, kind?: ToastItem["kind"]) => void;
  dismissToast: (id: number) => void;
  refreshGit: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshGitLog: () => Promise<void>;
  startTask: (name: string) => number;
  appendTaskOutput: (id: number, data: string, stream: string) => void;
  finishTask: (id: number, code: number | null) => void;
  clearTasks: () => void;
  toggleBreakpoint: (path: string, line: number) => void;
  removeBreakpoint: (path: string, line: number) => void;
  clearBreakpoints: () => void;
  setDebugActive: (active: boolean) => void;
  setDebugPaused: (paused: boolean) => void;
  setDebugThread: (threadId: number | null) => void;
  setDebugFrames: (frames: StackFrame[]) => void;
  setDebugSelectedFrame: (frameId: number | null) => void;
  setDebugScopes: (scopes: DebugScope[]) => void;
  appendDebugOutput: (text: string) => void;
  clearDebugOutput: () => void;
  resetDebug: () => void;
  addWatch: (expression: string) => number;
  removeWatch: (index: number) => void;
  setWatchResult: (index: number, value: string, error?: boolean) => void;
  setLspStatus: (language: string, status: LspStatus) => void;
  setPythonPackages: (packages: { name: string; version: string }[]) => void;
  setPythonLoading: (loading: boolean) => void;
  updatePaths: (oldPath: string, newPath: string) => void;
  handleDeletedPath: (path: string) => void;
  setPendingReveal: (reveal: { path: string; line: number; column: number } | null) => void;
  clearPendingReveal: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  workspace: null,
  project: null,
  config: cloneConfig(defaultConfig),
  configPath: "",
  home: "",
  recent: [],
  openFiles: [],
  activeFile: null,
  problems: [],
  outline: [],
  treeVersion: 0,
  sidebarView: "explorer",
  sidebarVisible: true,
  rightPanelVisible: false,
  rightView: "outline",
  bottomVisible: false,
  bottomTab: "terminal",
  git: null,
  gitBranches: [],
  gitLog: [],
  gitLoading: false,
  tasks: [],
  activeTaskId: null,
  diff: null,
  settingsOpen: false,
  newProjectOpen: false,
  quickOpenOpen: false,
  cursor: { line: 1, column: 1 },
  pendingReveal: null,
  toasts: [],
  breakpoints: [],
  debugActive: false,
  debugPaused: false,
  debugThreadId: null,
  debugFrames: [],
  debugSelectedFrame: null,
  debugScopes: [],
  debugOutput: "",
  watches: [],
  lspStatus: {},
  pythonPackages: [],
  pythonLoading: false,

  bootstrap: async () => {
    try {
      const [config, configPath, home] = await Promise.all([
        api.getConfig(),
        api.getConfigPath(),
        api.homeDir(),
      ]);
      get().applyConfig(config);
      set({ configPath, home });
    } catch (error) {
      console.error("Config yüklenemedi", error);
    }
    const recent = readRecent();
    set({ recent, ready: true });
    const last = localStorage.getItem("zenide.lastWorkspace");
    if (last) {
      try {
        const exists = await api.pathExists(last);
        if (!exists) {
          localStorage.removeItem("zenide.lastWorkspace");
          return;
        }
        await get().setWorkspace(last);
      } catch {
        localStorage.removeItem("zenide.lastWorkspace");
      }
    }
  },

  applyConfig: (config) => {
    const previous = get().config;
    set({ config });
    applyTheme(config.theme);
    applyEditorFont(config.editor);
    if (config.ui.show_right_panel !== previous.ui.show_right_panel) {
      set({ rightPanelVisible: config.ui.show_right_panel });
    }
  },

  updateConfig: async (config) => {
    get().applyConfig(config);
    try {
      await api.saveConfig(config);
    } catch (error) {
      get().toast(String(error), "error");
    }
  },

  toggleVim: async () => {
    const config = cloneConfig(get().config);
    config.editor.vim_mode = !config.editor.vim_mode;
    await get().updateConfig(config);
    get().toast(
      `Vim modu ${config.editor.vim_mode ? "açık" : "kapalı"}.`,
      "info"
    );
  },

  setWorkspace: async (path) => {
    const state = get();
    if (path && state.workspace && pathKey(path) === pathKey(state.workspace)) {
      await state.refreshProject();
      return;
    }
    for (const file of state.openFiles) {
      disposeModel(file.path);
      emit("file-closed", file.path);
    }
    set({
      workspace: path,
      project: null,
      openFiles: [],
      activeFile: null,
      problems: [],
      outline: [],
      git: null,
      gitBranches: [],
      gitLog: [],
      diff: null,
      pendingReveal: null,
      breakpoints: path ? readBreakpoints(path) : [],
      debugActive: false,
      debugPaused: false,
      debugFrames: [],
      debugScopes: [],
      debugSelectedFrame: null,
      debugThreadId: null,
      debugOutput: "",
      watches: [],
      pythonPackages: [],
      treeVersion: state.treeVersion + 1,
    });
    if (!path) {
      localStorage.removeItem("zenide.lastWorkspace");
      emit("workspace-changed", path);
      return;
    }
    localStorage.setItem("zenide.lastWorkspace", path);
    const recent = [
      path,
      ...state.recent.filter((item) => pathKey(item) !== pathKey(path)),
    ].slice(0, 8);
    localStorage.setItem("zenide.recent", JSON.stringify(recent));
    set({ recent });
    emit("workspace-changed", path);
    await get().refreshProject();
    await Promise.all([
      get().refreshGit(),
      get().refreshBranches(),
      get().refreshGitLog(),
    ]);
  },

  refreshProject: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    try {
      const project = await api.detectProject(workspace);
      set({ project });
    } catch (error) {
      console.error(error);
    }
  },

  refreshTree: () => set((state) => ({ treeVersion: state.treeVersion + 1 })),

  openFile: async (path, line, column) => {
    const existing = get().openFiles.find(
      (file) => pathKey(file.path) === pathKey(path)
    );
    if (existing) {
      set({
        activeFile: existing.path,
        pendingReveal: line
          ? { path: existing.path, line, column: column ?? 1 }
          : null,
      });
      return;
    }
    try {
      const content = await api.readFile(path);
      const language = detectLanguage(path);
      ensureModel(path, content, language);
      set((state) => ({
        openFiles: [...state.openFiles, { path, language, dirty: false }],
        activeFile: path,
        pendingReveal: line ? { path, line, column: column ?? 1 } : null,
      }));
    } catch (error) {
      get().toast(String(error), "error");
    }
  },

  closeFile: async (path) => {
    const file = get().openFiles.find(
      (item) => pathKey(item.path) === pathKey(path)
    );
    if (!file) return;
    if (file.dirty) {
      const shouldSave = window.confirm(
        `"${baseName(path)}" dosyasında kaydedilmemiş değişiklikler var. Kapatmadan önce kaydedilsin mi?`
      );
      if (shouldSave) {
        const saved = await get().saveFile(path);
        if (!saved) return;
      }
    }
    disposeModel(path);
    emit("file-closed", path);
    set((state) => {
      const remaining = state.openFiles.filter(
        (item) => pathKey(item.path) !== pathKey(path)
      );
      const activeFile =
        state.activeFile && pathKey(state.activeFile) === pathKey(path)
          ? remaining[remaining.length - 1]?.path ?? null
          : state.activeFile;
      return {
        openFiles: remaining,
        activeFile,
        problems: state.problems.filter(
          (problem) => pathKey(problem.path) !== pathKey(path)
        ),
      };
    });
  },

  closeActive: async () => {
    const active = get().activeFile;
    if (active) await get().closeFile(active);
  },

  saveFile: async (path) => {
    const model = getModel(path);
    if (!model) return false;
    try {
      await api.writeFile(path, model.getValue());
      set((state) => ({
        openFiles: state.openFiles.map((file) =>
          pathKey(file.path) === pathKey(path)
            ? { ...file, dirty: false }
            : file
        ),
      }));
      emit("file-saved", path);
      void get().refreshGit();
      return true;
    } catch (error) {
      get().toast(String(error), "error");
      return false;
    }
  },

  saveActive: async () => {
    const active = get().activeFile;
    if (!active) return false;
    return get().saveFile(active);
  },

  saveAll: async () => {
    const dirtyFiles = get().openFiles.filter((file) => file.dirty);
    for (const file of dirtyFiles) {
      await get().saveFile(file.path);
    }
  },

  markDirty: (path) => {
    const file = get().openFiles.find(
      (item) => pathKey(item.path) === pathKey(path)
    );
    if (!file || file.dirty) return;
    set((state) => ({
      openFiles: state.openFiles.map((item) =>
        pathKey(item.path) === pathKey(path) ? { ...item, dirty: true } : item
      ),
    }));
  },

  setActiveFile: (path) => set({ activeFile: path }),
  setCursor: (line, column) => set({ cursor: { line, column } }),

  setProblemsForFile: (path, problems) => {
    set((state) => {
      const key = pathKey(path);
      const others = state.problems.filter(
        (problem) => pathKey(problem.path) !== key
      );
      return { problems: [...others, ...problems] };
    });
  },

  clearProblemsForFile: (path) => {
    set((state) => ({
      problems: state.problems.filter(
        (problem) => pathKey(problem.path) !== pathKey(path)
      ),
    }));
  },

  setOutline: (symbols) => set({ outline: symbols }),

  setSidebarView: (view) => set({ sidebarView: view, sidebarVisible: true }),

  toggleSidebarView: (view) => {
    const state = get();
    if (state.sidebarVisible && state.sidebarView === view) {
      set({ sidebarVisible: false });
    } else {
      set({ sidebarView: view, sidebarVisible: true });
    }
  },

  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),
  toggleRightPanel: () =>
    set((state) => ({ rightPanelVisible: !state.rightPanelVisible })),
  setRightView: (view) => set({ rightView: view }),

  setBottomVisible: (visible) => set({ bottomVisible: visible }),

  toggleBottom: (tab) => {
    const state = get();
    if (tab) {
      if (state.bottomVisible && state.bottomTab === tab) {
        set({ bottomVisible: false });
      } else {
        set({ bottomVisible: true, bottomTab: tab });
      }
    } else {
      set({ bottomVisible: !state.bottomVisible });
    }
  },

  setBottomTab: (tab) => set({ bottomTab: tab, bottomVisible: true }),

  setDiff: (diff) => set({ diff }),
  closeDiff: () => set({ diff: null }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setNewProjectOpen: (open) => set({ newProjectOpen: open }),
  setQuickOpenOpen: (open) => set({ quickOpenOpen: open }),

  toast: (message, kind = "info") => {
    const id = ++toastCounter;
    set((state) => ({
      toasts: [...state.toasts, { id, message, kind }],
    }));
    window.setTimeout(() => get().dismissToast(id), 5200);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),

  refreshGit: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ gitLoading: true });
    try {
      const git = await api.gitStatus(workspace);
      set({ git, gitLoading: false });
    } catch (error) {
      set({
        git: {
          is_repo: false,
          branch: "",
          entries: [],
          error: String(error),
        },
        gitLoading: false,
      });
    }
  },

  refreshBranches: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    try {
      const branches = await api.gitBranches(workspace);
      set({ gitBranches: branches });
    } catch {
      set({ gitBranches: [] });
    }
  },

  refreshGitLog: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    try {
      const log = await api.gitLog(workspace, 15);
      set({ gitLog: log });
    } catch {
      set({ gitLog: [] });
    }
  },

  startTask: (name) => {
    const id = ++taskCounter;
    set((state) => ({
      tasks: [
        ...state.tasks,
        { id, name, output: "", running: true, code: null },
      ],
      activeTaskId: id,
    }));
    return id;
  },

  appendTaskOutput: (id, data) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, output: task.output + data } : task
      ),
    }));
  },

  finishTask: (id, code) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, running: false, code } : task
      ),
    }));
  },

  clearTasks: () => set({ tasks: [], activeTaskId: null }),

  toggleBreakpoint: (path, line) => {
    const state = get();
    const exists = state.breakpoints.some(
      (breakpoint) =>
        pathKey(breakpoint.path) === pathKey(path) &&
        breakpoint.line === line
    );
    const breakpoints = exists
      ? state.breakpoints.filter(
          (breakpoint) =>
            !(
              pathKey(breakpoint.path) === pathKey(path) &&
              breakpoint.line === line
            )
        )
      : [...state.breakpoints, { path, line }].sort((a, b) =>
          pathKey(a.path) === pathKey(b.path)
            ? a.line - b.line
            : a.path.localeCompare(b.path)
        );
    set({ breakpoints });
    writeBreakpoints(state.workspace, breakpoints);
    emit("breakpoints-changed", breakpoints);
  },

  removeBreakpoint: (path, line) => {
    const state = get();
    const breakpoints = state.breakpoints.filter(
      (breakpoint) =>
        !(
          pathKey(breakpoint.path) === pathKey(path) &&
          breakpoint.line === line
        )
    );
    set({ breakpoints });
    writeBreakpoints(state.workspace, breakpoints);
    emit("breakpoints-changed", breakpoints);
  },

  clearBreakpoints: () => {
    const state = get();
    set({ breakpoints: [] });
    writeBreakpoints(state.workspace, []);
    emit("breakpoints-changed", []);
  },

  setDebugActive: (active) => set({ debugActive: active }),
  setDebugPaused: (paused) => set({ debugPaused: paused }),
  setDebugThread: (threadId) => set({ debugThreadId: threadId }),
  setDebugFrames: (frames) => set({ debugFrames: frames }),
  setDebugSelectedFrame: (frameId) => set({ debugSelectedFrame: frameId }),
  setDebugScopes: (scopes) => set({ debugScopes: scopes }),
  appendDebugOutput: (text) =>
    set((state) => ({ debugOutput: state.debugOutput + text })),
  clearDebugOutput: () => set({ debugOutput: "" }),

  resetDebug: () =>
    set({
      debugActive: false,
      debugPaused: false,
      debugThreadId: null,
      debugFrames: [],
      debugSelectedFrame: null,
      debugScopes: [],
      watches: [],
    }),

  addWatch: (expression) => {
    const watches = [...get().watches, { expression, value: "—" }];
    set({ watches });
    return watches.length - 1;
  },

  removeWatch: (index) =>
    set((state) => ({
      watches: state.watches.filter((_, itemIndex) => itemIndex !== index),
    })),

  setWatchResult: (index, value, error = false) =>
    set((state) => ({
      watches: state.watches.map((watch, itemIndex) =>
        itemIndex === index ? { ...watch, value, error } : watch
      ),
    })),

  setLspStatus: (language, status) =>
    set((state) => ({
      lspStatus: { ...state.lspStatus, [language]: status },
    })),

  setPythonPackages: (packages) => set({ pythonPackages: packages }),
  setPythonLoading: (loading) => set({ pythonLoading: loading }),

  updatePaths: (oldPath, newPath) => {
    const state = get();
    const affected = state.openFiles.filter((file) =>
      isSubPath(oldPath, file.path)
    );
    const newOpenFiles = state.openFiles.map((file) => {
      if (!isSubPath(oldPath, file.path)) return file;
      const suffix = file.path.slice(oldPath.length);
      const target = newPath + suffix;
      const model = getModel(file.path);
      const content = model?.getValue() ?? "";
      disposeModel(file.path);
      ensureModel(target, content, file.language);
      emit("file-closed", file.path);
      return { ...file, path: target };
    });
    const activeFile =
      state.activeFile && isSubPath(oldPath, state.activeFile)
        ? newPath + state.activeFile.slice(oldPath.length)
        : state.activeFile;
    const breakpoints = state.breakpoints.map((breakpoint) =>
      isSubPath(oldPath, breakpoint.path)
        ? {
            ...breakpoint,
            path: newPath + breakpoint.path.slice(oldPath.length),
          }
        : breakpoint
    );
    const problems = state.problems.map((problem) =>
      isSubPath(oldPath, problem.path)
        ? { ...problem, path: newPath + problem.path.slice(oldPath.length) }
        : problem
    );
    set({
      openFiles: newOpenFiles,
      activeFile,
      breakpoints,
      problems,
      treeVersion: state.treeVersion + 1,
    });
    writeBreakpoints(state.workspace, breakpoints);
    if (affected.length > 0) {
      emit("breakpoints-changed", breakpoints);
    }
  },

  handleDeletedPath: (path) => {
    const state = get();
    const affected = state.openFiles.filter((file) =>
      isSubPath(path, file.path)
    );
    for (const file of affected) {
      disposeModel(file.path);
      emit("file-closed", file.path);
    }
    const openFiles = state.openFiles.filter(
      (file) => !isSubPath(path, file.path)
    );
    const activeFile =
      state.activeFile && isSubPath(path, state.activeFile)
        ? openFiles[openFiles.length - 1]?.path ?? null
        : state.activeFile;
    const problems = state.problems.filter(
      (problem) => !isSubPath(path, problem.path)
    );
    const breakpoints = state.breakpoints.filter(
      (breakpoint) => !isSubPath(path, breakpoint.path)
    );
    set({
      openFiles,
      activeFile,
      problems,
      breakpoints,
      treeVersion: state.treeVersion + 1,
    });
    writeBreakpoints(state.workspace, breakpoints);
    if (breakpoints.length !== state.breakpoints.length) {
      emit("breakpoints-changed", breakpoints);
    }
  },

  setPendingReveal: (reveal) => set({ pendingReveal: reveal }),
  clearPendingReveal: () => set({ pendingReveal: null }),
}));

export function currentRelativePath(path: string): string {
  const workspace = useStore.getState().workspace;
  if (!workspace) return path;
  if (isSubPath(workspace, path)) {
    return path.slice(workspace.length).replace(/^[\\/]/, "");
  }
  return path;
}

export function newFileSiblingPath(entryPath: string): string {
  return joinPath(dirName(entryPath), baseName(entryPath));
}
