import { useStore } from "../store";
import { openFolder } from "../actions";
import { baseName } from "../utils/path";
import iconUrl from "../assets/icon.png";
import { CommandIcon, FolderIcon, PlusIcon, SettingsIcon } from "./Icons";

const shortcuts: { keys: string; label: string }[] = [
  { keys: "Ctrl+P", label: "Quick open file" },
  { keys: "Ctrl+S", label: "Save" },
  { keys: "Ctrl+Shift+F", label: "Search in project" },
  { keys: "Ctrl+`", label: "Terminal" },
  { keys: "Ctrl+Shift+B", label: "Build" },
  { keys: "F5", label: "Debug" },
];

export function Welcome() {
  const workspace = useStore((state) => state.workspace);
  const recent = useStore((state) => state.recent);
  const project = useStore((state) => state.project);

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-brand">
          <img src={iconUrl} alt="ZenIDE" className="welcome-logo" />
          <div>
            <h1>ZenIDE</h1>
            <p>A minimal, cross-platform desktop IDE</p>
          </div>
        </div>
        {workspace ? (
          <div className="welcome-section">
            <h2>{project?.name || baseName(workspace)}</h2>
            <p className="welcome-muted">
              Use the explorer to open a file or search with quick open.
            </p>
            <button
              className="primary-button"
              onClick={() => useStore.getState().setQuickOpenOpen(true)}
            >
              <CommandIcon size={14} /> Quick Open (Ctrl+P)
            </button>
          </div>
        ) : (
          <div className="welcome-section">
            <h2>Get Started</h2>
            <div className="welcome-actions">
              <button className="primary-button" onClick={() => void openFolder()}>
                <FolderIcon size={14} /> Open Folder
              </button>
              <button
                className="secondary-button"
                onClick={() => useStore.getState().setNewProjectOpen(true)}
              >
                <PlusIcon size={14} /> New Project
              </button>
              <button
                className="secondary-button"
                onClick={() => useStore.getState().setSettingsOpen(true)}
              >
                <SettingsIcon size={14} /> Settings
              </button>
            </div>
          </div>
        )}
        {recent.length > 0 && (
          <div className="welcome-section">
            <h3>Recent</h3>
            <div className="recent-list">
              {recent.map((path) => (
                <button
                  key={path}
                  className="recent-item"
                  title={path}
                  onClick={() => void useStore.getState().setWorkspace(path)}
                >
                  <FolderIcon size={13} />
                  <span className="recent-name">{baseName(path)}</span>
                  <span className="recent-path">{path}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="welcome-section">
          <h3>Shortcuts</h3>
          <div className="shortcut-grid">
            {shortcuts.map((shortcut) => (
              <div className="shortcut-row" key={shortcut.keys}>
                <span className="shortcut-keys">{shortcut.keys}</span>
                <span>{shortcut.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
