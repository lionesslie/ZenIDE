import { useEffect } from "react";
import { MenuBar } from "./components/MenuBar";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { EditorArea } from "./components/EditorArea";
import { BottomPanel } from "./components/BottomPanel";
import { RightPanel } from "./components/RightPanel";
import { StatusBar } from "./components/StatusBar";
import { Toasts } from "./components/Toasts";
import { SettingsModal } from "./components/SettingsModal";
import { NewProjectModal } from "./components/NewProjectModal";
import { QuickOpen } from "./components/QuickOpen";
import { DiffModal } from "./components/DiffModal";
import * as api from "./api";
import { on } from "./bus";
import { useStore } from "./store";
import { matchesBinding, runAction } from "./actions";
import { registerExtraLanguages } from "./editor/languages";
import { registerLspProviders } from "./lsp/providers";
import { lspManager } from "./lsp/LspManager";
import { initTaskService } from "./services/taskService";
import { initDebugService } from "./services/debugService";
import { baseName, pathKey } from "./utils/path";
import type { ZenConfig } from "./types";

export default function App() {
  const workspace = useStore((state) => state.workspace);
  const sidebarVisible = useStore((state) => state.sidebarVisible);
  const rightPanelVisible = useStore((state) => state.rightPanelVisible);
  const settingsOpen = useStore((state) => state.settingsOpen);
  const newProjectOpen = useStore((state) => state.newProjectOpen);
  const quickOpenOpen = useStore((state) => state.quickOpenOpen);
  const diff = useStore((state) => state.diff);

  useEffect(() => {
    registerExtraLanguages();
    registerLspProviders();
    void initDebugService();
    void lspManager.init();
    void initTaskService();
    void useStore.getState().bootstrap();
    return () => {
      void lspManager.shutdownAll();
    };
  }, []);

  useEffect(() => {
    const unlisteners: (() => void)[] = [];
    let cancelled = false;
    void api
      .onEvent<ZenConfig>("config-changed", (config) => {
        useStore.getState().applyConfig(config);
      })
      .then((unlisten) => {
        if (cancelled) unlisten();
        else unlisteners.push(unlisten);
      });
    const offClose = on("file-closed", (path: string) => lspManager.didClose(path));
    const offSave = on("file-saved", (path: string) => lspManager.didSave(path));
    const offWorkspace = on("workspace-changed", () => {
      void lspManager.shutdownAll();
    });
    return () => {
      cancelled = true;
      offClose();
      offSave();
      offWorkspace();
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  useEffect(() => {
    let previous = new Map<string, string>();
    const sync = () => {
      const openFiles = useStore.getState().openFiles;
      const current = new Map<string, string>();
      for (const file of openFiles) {
        const key = pathKey(file.path);
        current.set(key, file.path);
        if (!previous.has(key)) {
          void lspManager.openFile(file.path, file.language);
        }
      }
      previous = current;
    };
    sync();
    let lastOpenFiles = useStore.getState().openFiles;
    const unsubscribe = useStore.subscribe((state) => {
      if (state.openFiles === lastOpenFiles) return;
      lastOpenFiles = state.openFiles;
      sync();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const state = useStore.getState();
      if (
        state.settingsOpen ||
        state.newProjectOpen ||
        state.quickOpenOpen ||
        state.diff
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isField =
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable;
        const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
        const isFunctionKey = /^F\d{1,2}$/.test(event.key);
        if (isField && !hasModifier && !isFunctionKey) {
          return;
        }
      }
      for (const [action, binding] of Object.entries(state.config.keybindings)) {
        if (matchesBinding(event, binding)) {
          event.preventDefault();
          event.stopPropagation();
          void runAction(action);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  useEffect(() => {
    document.title = workspace ? `ZenIDE — ${baseName(workspace)}` : "ZenIDE";
  }, [workspace]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".context-menu")) return;
      event.preventDefault();
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <div className="app">
      <MenuBar />
      <div className="app-body">
        <ActivityBar />
        {sidebarVisible && <Sidebar />}
        <div className="main-column">
          <EditorArea />
          <BottomPanel />
        </div>
        {rightPanelVisible && <RightPanel />}
      </div>
      <StatusBar />
      <Toasts />
      {settingsOpen && <SettingsModal />}
      {newProjectOpen && <NewProjectModal />}
      {quickOpenOpen && <QuickOpen />}
      {diff && <DiffModal />}
    </div>
  );
}
