import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import {
  createProjectVenv,
  installPythonPackage,
  pythonExecutable,
  refreshPythonPackages,
  uninstallPythonPackage,
} from "../services/pythonService";
import {
  GlobeIcon,
  PackageIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from "./Icons";

export function PythonPanel() {
  const workspace = useStore((state) => state.workspace);
  const project = useStore((state) => state.project);
  const config = useStore((state) => state.config);
  const packages = useStore((state) => state.pythonPackages);
  const loading = useStore((state) => state.pythonLoading);
  const [query, setQuery] = useState("");
  const [packageName, setPackageName] = useState("");

  useEffect(() => {
    if (workspace && project?.kind === "python") {
      void refreshPythonPackages(true);
    }
  }, [workspace, project?.kind]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return packages;
    return packages.filter((item) =>
      item.name.toLowerCase().includes(needle)
    );
  }, [packages, query]);

  if (!workspace) {
    return (
      <div className="empty-panel">
        <p>Python araçları için bir proje açın.</p>
      </div>
    );
  }

  const python = pythonExecutable(config, project);

  const install = async () => {
    const name = packageName.trim();
    if (!name) return;
    const success = await installPythonPackage(name);
    if (success) setPackageName("");
  };

  return (
    <div className="python-panel">
      <div className="python-info">
        <div className="python-info-row">
          <GlobeIcon size={14} />
          <span className="python-label">Yorumlayıcı</span>
          <span className="python-value" title={python}>
            {python}
          </span>
        </div>
        <div className="python-info-row">
          <PackageIcon size={14} />
          <span className="python-label">Proje</span>
          <span className="python-value">
            {project?.kind === "python" ? project.name : "Python projesi değil"}
          </span>
        </div>
        {project?.venv && (
          <div className="python-info-row">
            <span className="python-label">Sanal ortam</span>
            <span className="python-value" title={project.venv}>
              {project.venv}
            </span>
          </div>
        )}
      </div>
      <div className="python-actions">
        <button
          className="small-button"
          disabled={loading}
          onClick={() => void refreshPythonPackages()}
        >
          <RefreshIcon size={12} /> Paketleri Yenile
        </button>
        <button
          className="small-button"
          disabled={loading || project?.kind !== "python"}
          onClick={() => void createProjectVenv()}
        >
          Sanal Ortam Oluştur
        </button>
      </div>
      <form
        className="package-install"
        onSubmit={(event) => {
          event.preventDefault();
          void install();
        }}
      >
        <input
          placeholder="Paket adı (ör. requests)"
          value={packageName}
          onChange={(event) => setPackageName(event.target.value)}
        />
        <button
          className="icon-button small"
          type="submit"
          disabled={loading || !packageName.trim()}
          title="Kur"
        >
          <PlusIcon size={13} />
        </button>
      </form>
      <div className="package-filter">
        <input
          placeholder="Paketlerde filtrele…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="package-list">
        {loading && <div className="empty-panel small">Yükleniyor…</div>}
        {!loading && filtered.length === 0 && (
          <div className="empty-panel small">
            {packages.length === 0 ? "Paket bulunamadı." : "Eşleşen paket yok."}
          </div>
        )}
        {!loading &&
          filtered.map((item) => (
            <div className="package-row" key={item.name}>
              <span className="package-name">{item.name}</span>
              <span className="package-version">{item.version}</span>
              <button
                className="icon-button small"
                title="Kaldır"
                disabled={loading}
                onClick={() => void uninstallPythonPackage(item.name)}
              >
                <TrashIcon size={12} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
