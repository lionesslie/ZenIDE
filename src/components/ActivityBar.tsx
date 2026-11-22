import { useStore } from "../store";
import type { SidebarView } from "../types";
import {
  BugIcon,
  FilesIcon,
  GitBranchIcon,
  PythonIcon,
  SearchIcon,
  SettingsIcon,
} from "./Icons";

const views: { id: SidebarView; label: string; icon: JSX.Element }[] = [
  { id: "explorer", label: "Explorer", icon: <FilesIcon size={19} /> },
  { id: "search", label: "Search", icon: <SearchIcon size={19} /> },
  { id: "git", label: "Source Control", icon: <GitBranchIcon size={19} /> },
  { id: "debug", label: "Debug", icon: <BugIcon size={19} /> },
  { id: "python", label: "Python", icon: <PythonIcon size={19} /> },
];

export function ActivityBar() {
  const sidebarView = useStore((state) => state.sidebarView);
  const sidebarVisible = useStore((state) => state.sidebarVisible);
  const debugActive = useStore((state) => state.debugActive);
  const gitCount = useStore(
    (state) => state.git?.entries.length ?? 0
  );

  return (
    <div className="activity-bar">
      <div className="activity-top">
        {views.map((view) => (
          <button
            key={view.id}
            className={`activity-button ${
              sidebarVisible && sidebarView === view.id ? "active" : ""
            }`}
            title={view.label}
            onClick={() => useStore.getState().toggleSidebarView(view.id)}
          >
            {view.icon}
            {view.id === "git" && gitCount > 0 && (
              <span className="activity-badge">{gitCount}</span>
            )}
            {view.id === "debug" && debugActive && (
              <span className="activity-badge debug" />
            )}
          </button>
        ))}
      </div>
      <div className="activity-bottom">
        <button
          className="activity-button"
          title="Settings"
          onClick={() => useStore.getState().setSettingsOpen(true)}
        >
          <SettingsIcon size={19} />
        </button>
      </div>
    </div>
  );
}
