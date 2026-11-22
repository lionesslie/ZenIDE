import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import iconUrl from "../assets/icon.png";
import { useStore } from "../store";
import {
  openConfigFile,
  openFolder,
  runAction,
} from "../actions";
import * as api from "../api";
import {
  BugIcon,
  BuildIcon,
  CloseIcon,
  MaximizeIcon,
  MinimizeIcon,
  PlayIcon,
  RestoreIcon,
  SaveIcon,
  SettingsIcon,
  TerminalIcon,
} from "./Icons";

interface MenuItem {
  label?: string;
  action?: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const keybindings = useStore((state) => state.config.keybindings);
  const projectKind = useStore((state) => state.project?.kind ?? "unknown");
  const workspace = useStore((state) => state.workspace);
  const projectName = useStore((state) => state.project?.name ?? "");

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const sync = () => {
      void appWindow.isMaximized().then((value) => {
        if (!disposed) setMaximized(value);
      });
    };
    sync();
    void appWindow.onResized(sync).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const shortcut = (action: string) => keybindings[action] ?? "";
  const isRust = projectKind === "rust";

  const handleItem = async (item: MenuItem) => {
    if (item.disabled) return;
    setOpenMenu(null);
    if (item.onClick) {
      await item.onClick();
      return;
    }
    if (item.action) {
      await runAction(item.action);
    }
  };

  const gitOperation = async (
    operation: "push" | "pull" | "init"
  ): Promise<void> => {
    const state = useStore.getState();
    if (!state.workspace) return;
    try {
      if (operation === "push") {
        const output = await api.gitPush(state.workspace);
        state.toast(output.trim().split("\n").pop() || "Push completed.", "success");
      } else if (operation === "pull") {
        const output = await api.gitPull(state.workspace);
        state.toast(output.trim().split("\n").pop() || "Pull completed.", "success");
      } else {
        await api.gitInit(state.workspace);
        state.toast("Git repository initialized.", "success");
      }
      await Promise.all([
        state.refreshGit(),
        state.refreshBranches(),
        state.refreshGitLog(),
      ]);
    } catch (error) {
      state.toast(String(error), "error");
    }
  };

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: "File",
      items: [
        { label: "New Project…", action: "new_project", shortcut: shortcut("new_project") },
        { label: "Open Folder…", onClick: openFolder },
        { separator: true },
        { label: "Save", action: "save", shortcut: shortcut("save") },
        { label: "Save All", action: "save_all", shortcut: shortcut("save_all") },
        { label: "Close Tab", action: "close_tab", shortcut: shortcut("close_tab") },
        { separator: true },
        { label: "Settings", action: "settings", shortcut: shortcut("settings") },
        { label: "Open Config File", onClick: openConfigFile },
        { label: "Reload Config", action: "reload_config", shortcut: shortcut("reload_config") },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Explorer", onClick: () => useStore.getState().setSidebarView("explorer") },
        { label: "Search", action: "search", shortcut: shortcut("search") },
        { label: "Source Control", action: "git", shortcut: shortcut("git") },
        { label: "Debug", onClick: () => useStore.getState().setSidebarView("debug") },
        { label: "Python", action: "python_packages" },
        { separator: true },
        { label: "Terminal", action: "toggle_terminal", shortcut: shortcut("toggle_terminal") },
        { label: "Problems", action: "problems", shortcut: shortcut("problems") },
        { label: "Toggle Right Panel", onClick: () => useStore.getState().toggleRightPanel() },
      ],
    },
    {
      label: "Build",
      items: [
        { label: "Build", action: "build", shortcut: shortcut("build") },
        { label: "Run", action: "run", shortcut: shortcut("run") },
        { label: "Test", action: "test" },
        { separator: true },
        { label: "cargo check", action: "rust_check", disabled: !isRust },
        { label: "cargo clippy", action: "rust_clippy", disabled: !isRust },
        { label: "cargo fmt", action: "rust_fmt", disabled: !isRust },
        { label: "Format Document (LSP)", action: "format", shortcut: shortcut("format") },
      ],
    },
    {
      label: "Debug",
      items: [
        { label: "Start Debugging", action: "debug", shortcut: shortcut("debug") },
        { label: "Stop", action: "stop_debug" },
        { separator: true },
        { label: "Continue", onClick: () => void runAction("debug_continue") },
        { label: "Step Over", onClick: () => void runAction("debug_next") },
        { label: "Step Into", onClick: () => void runAction("debug_step_in") },
        { label: "Step Out", onClick: () => void runAction("debug_step_out") },
      ],
    },
    {
      label: "Git",
      items: [
        { label: "Refresh", onClick: () => {
          const state = useStore.getState();
          void Promise.all([state.refreshGit(), state.refreshBranches(), state.refreshGitLog()]);
        } },
        { label: "Source Control", action: "git", shortcut: shortcut("git") },
        { separator: true },
        { label: "Push", disabled: !workspace, onClick: () => void gitOperation("push") },
        { label: "Pull", disabled: !workspace, onClick: () => void gitOperation("pull") },
        { label: "Init Repository", disabled: !workspace, onClick: () => void gitOperation("init") },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Open Config File", onClick: openConfigFile },
        { label: "About", onClick: () => useStore.getState().toast("ZenIDE 0.1.0 — a minimal, cross-platform IDE", "info") },
      ],
    },
  ];

  const appWindow = getCurrentWindow();
  return (
    <div
      className="menubar"
      ref={rootRef}
      data-tauri-drag-region
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        void appWindow.toggleMaximize();
      }}
    >
      <div className="menubar-brand" data-tauri-drag-region>
        <img src={iconUrl} alt="ZenIDE" className="brand-mark brand-icon" data-tauri-drag-region />
        <span className="brand-name" data-tauri-drag-region>ZenIDE</span>
        {projectName && <span className="brand-project" data-tauri-drag-region>{projectName}</span>}
      </div>
      <div className="menus">
        {menus.map((menu) => (
          <div className="menu-root" key={menu.label}>
            <button
              className={`menu-button ${openMenu === menu.label ? "open" : ""}`}
              onClick={() =>
                setOpenMenu(openMenu === menu.label ? null : menu.label)
              }
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div className="menu-dropdown">
                {menu.items.map((item, index) =>
                  item.separator ? (
                    <div className="menu-separator" key={`sep-${index}`} />
                  ) : (
                    <button
                      className={`menu-item ${item.disabled ? "disabled" : ""}`}
                      key={item.label}
                      onClick={() => void handleItem(item)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="menu-shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="menubar-actions">
        <button className="icon-button" title="Build (Ctrl+Shift+B)" onClick={() => void runAction("build")}>
          <BuildIcon size={15} />
        </button>
        <button className="icon-button" title="Run (Ctrl+F5)" onClick={() => void runAction("run")}>
          <PlayIcon size={15} />
        </button>
        <button className="icon-button" title="Debug (F5)" onClick={() => void runAction("debug")}>
          <BugIcon size={15} />
        </button>
        <span className="toolbar-divider" />
        <button className="icon-button" title="Save (Ctrl+S)" onClick={() => void runAction("save")}>
          <SaveIcon size={15} />
        </button>
        <button className="icon-button" title="Terminal (Ctrl+`)" onClick={() => void runAction("toggle_terminal")}>
          <TerminalIcon size={15} />
        </button>
        <button className="icon-button" title="Settings (Ctrl+,)" onClick={() => useStore.getState().setSettingsOpen(true)}>
          <SettingsIcon size={15} />
        </button>
        <div className="window-controls">
          <button className="icon-button window-control" title="Minimize" aria-label="Minimize" onClick={() => void appWindow.minimize()}>
            <MinimizeIcon size={13} />
          </button>
          <button
            className="icon-button window-control"
            title={maximized ? "Restore" : "Maximize"}
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={() => void appWindow.toggleMaximize()}
          >
            {maximized ? <RestoreIcon size={13} /> : <MaximizeIcon size={13} />}
          </button>
          <button className="icon-button window-control window-close" title="Close" aria-label="Close" onClick={() => void appWindow.close()}>
            <CloseIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
