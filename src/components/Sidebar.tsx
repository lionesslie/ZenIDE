import { useStore } from "../store";
import { FileTree } from "./FileTree";
import { SearchPanel } from "./SearchPanel";
import { GitPanel } from "./GitPanel";
import { DebugPanel } from "./DebugPanel";
import { PythonPanel } from "./PythonPanel";
import { CloseIcon, PlusIcon, RefreshIcon } from "./Icons";
import { openFolder } from "../actions";

const titles: Record<string, string> = {
  explorer: "EXPLORER",
  search: "SEARCH",
  git: "SOURCE CONTROL",
  debug: "DEBUG",
  python: "PYTHON",
};

export function Sidebar() {
  const view = useStore((state) => state.sidebarView);
  const workspace = useStore((state) => state.workspace);
  const width = useStore((state) => state.config.ui.sidebar_width);

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-title">{titles[view]}</span>
        <div className="sidebar-actions">
          {view === "explorer" && (
            <>
              <button
                className="icon-button small"
                title="Yeni Proje"
                onClick={() => useStore.getState().setNewProjectOpen(true)}
              >
                <PlusIcon size={14} />
              </button>
              <button
                className="icon-button small"
                title="Yenile"
                onClick={() => useStore.getState().refreshTree()}
              >
                <RefreshIcon size={14} />
              </button>
            </>
          )}
          {view === "git" && (
            <button
              className="icon-button small"
              title="Yenile"
              onClick={() => {
                const state = useStore.getState();
                void Promise.all([
                  state.refreshGit(),
                  state.refreshBranches(),
                  state.refreshGitLog(),
                ]);
              }}
            >
              <RefreshIcon size={14} />
            </button>
          )}
          <button
            className="icon-button small"
            title="Paneli kapat"
            onClick={() => useStore.getState().setSidebarVisible(false)}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>
      {view === "explorer" && workspace && (
        <div className="workspace-row" title={workspace}>
          <span className="workspace-name">
            {workspace.split(/[\\/]/).filter(Boolean).pop()}
          </span>
          <button
            className="icon-button small"
            title="Open another folder"
            onClick={() => void openFolder()}
          >
            …
          </button>
        </div>
      )}
      <div className="sidebar-body">
        {view === "explorer" && <FileTree />}
        {view === "search" && <SearchPanel />}
        {view === "git" && <GitPanel />}
        {view === "debug" && <DebugPanel />}
        {view === "python" && <PythonPanel />}
      </div>
    </div>
  );
}
