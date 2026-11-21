import { useStore } from "../store";
import { openFolder } from "../actions";
import { baseName } from "../utils/path";
import { CommandIcon, FolderIcon, PlusIcon, SettingsIcon } from "./Icons";

const shortcuts: { keys: string; label: string }[] = [
  { keys: "Ctrl+P", label: "Hızlı dosya aç" },
  { keys: "Ctrl+S", label: "Kaydet" },
  { keys: "Ctrl+Shift+F", label: "Projede ara" },
  { keys: "Ctrl+`", label: "Terminal" },
  { keys: "Ctrl+Shift+B", label: "Derle" },
  { keys: "F5", label: "Hata ayıkla" },
];

export function Welcome() {
  const workspace = useStore((state) => state.workspace);
  const recent = useStore((state) => state.recent);
  const project = useStore((state) => state.project);

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-brand">
          <span className="welcome-logo">Z</span>
          <div>
            <h1>ZenIDE</h1>
            <p>Rust, C++ ve Python için minimal masaüstü IDE</p>
          </div>
        </div>
        {workspace ? (
          <div className="welcome-section">
            <h2>{project?.name || baseName(workspace)}</h2>
            <p className="welcome-muted">
              Bir dosya açmak için gezgini kullanın veya hızlı aç ile arayın.
            </p>
            <button
              className="primary-button"
              onClick={() => useStore.getState().setQuickOpenOpen(true)}
            >
              <CommandIcon size={14} /> Hızlı Aç (Ctrl+P)
            </button>
          </div>
        ) : (
          <div className="welcome-section">
            <h2>Başlayın</h2>
            <div className="welcome-actions">
              <button className="primary-button" onClick={() => void openFolder()}>
                <FolderIcon size={14} /> Klasör Aç
              </button>
              <button
                className="secondary-button"
                onClick={() => useStore.getState().setNewProjectOpen(true)}
              >
                <PlusIcon size={14} /> Yeni Proje
              </button>
              <button
                className="secondary-button"
                onClick={() => useStore.getState().setSettingsOpen(true)}
              >
                <SettingsIcon size={14} /> Ayarlar
              </button>
            </div>
          </div>
        )}
        {recent.length > 0 && (
          <div className="welcome-section">
            <h3>Son Açılanlar</h3>
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
          <h3>Kısayollar</h3>
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
