import { useEffect, useState } from "react";
import * as api from "../api";
import { useStore } from "../store";
import { CloseIcon, FolderIcon } from "./Icons";

type Kind = "rust" | "cpp" | "python";

const kinds: { id: Kind; label: string; description: string }[] = [
  {
    id: "rust",
    label: "Rust",
    description: "Cargo.toml ve src/main.rs ile yeni bir ikili uygulama.",
  },
  {
    id: "cpp",
    label: "C++",
    description: "CMakeLists.txt ve src/main.cpp ile CMake projesi.",
  },
  {
    id: "python",
    label: "Python",
    description: "main.py, requirements.txt ve isteğe bağlı .venv.",
  },
];

export function NewProjectModal() {
  const workspace = useStore((state) => state.workspace);
  const home = useStore((state) => state.home);
  const [kind, setKind] = useState<Kind>("rust");
  const [parent, setParent] = useState(workspace ?? home);
  const [name, setName] = useState("");
  const [pythonPath, setPythonPath] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useStore.getState().setNewProjectOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const browse = async () => {
    try {
      const folder = await api.openFolderDialog();
      if (folder) setParent(folder);
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    }
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      useStore.getState().toast("Proje adı gerekli.", "error");
      return;
    }
    if (!parent.trim()) {
      useStore.getState().toast("Üst klasör gerekli.", "error");
      return;
    }
    setBusy(true);
    try {
      const path = await api.createProject(
        kind,
        parent.trim(),
        trimmed,
        kind === "python" ? pythonPath.trim() || null : null
      );
      useStore.getState().setNewProjectOpen(false);
      useStore.getState().toast(`Proje oluşturuldu: ${trimmed}`, "success");
      await useStore.getState().setWorkspace(path);
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          useStore.getState().setNewProjectOpen(false);
        }
      }}
    >
      <div className="new-project-modal">
        <div className="modal-header">
          <h2>Yeni Proje</h2>
          <button
            className="icon-button small"
            title="Kapat"
            onClick={() => useStore.getState().setNewProjectOpen(false)}
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="modal-body">
          <div className="kind-options">
            {kinds.map((item) => (
              <button
                key={item.id}
                className={`kind-option ${kind === item.id ? "active" : ""}`}
                onClick={() => setKind(item.id)}
              >
                <span className="kind-option-name">{item.label}</span>
                <span className="kind-option-desc">{item.description}</span>
              </button>
            ))}
          </div>
          <div className="form-row">
            <label className="form-label">Proje adı</label>
            <input
              className="form-input"
              autoFocus
              placeholder="zen-projesi"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !busy) void create();
              }}
            />
          </div>
          <div className="form-row">
            <label className="form-label">Üst klasör</label>
            <div className="input-with-button">
              <input
                className="form-input"
                value={parent}
                onChange={(event) => setParent(event.target.value)}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => void browse()}
              >
                <FolderIcon size={13} /> Gözat
              </button>
            </div>
          </div>
          {kind === "python" && (
            <div className="form-row">
              <label className="form-label">Python yorumlayıcısı (isteğe bağlı)</label>
              <input
                className="form-input"
                placeholder="python"
                value={pythonPath}
                onChange={(event) => setPythonPath(event.target.value)}
              />
              <p className="settings-hint">
                Boş bırakılırsa PATH üzerindeki python kullanılır. .venv
                oluşturmak birkaç dakika sürebilir.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => useStore.getState().setNewProjectOpen(false)}
          >
            İptal
          </button>
          <button
            className="primary-button"
            disabled={busy || !name.trim()}
            onClick={() => void create()}
          >
            {busy ? "Oluşturuluyor…" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
