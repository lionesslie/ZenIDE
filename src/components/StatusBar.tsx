import { useStore } from "../store";
import { getModel } from "../editor/models";
import { languageLabel } from "../utils/language";
import {
  ErrorIcon,
  GitBranchIcon,
  SettingsIcon,
  TerminalIcon,
  WarningIcon,
} from "./Icons";

const lspLanguages: { id: string; label: string }[] = [
  { id: "rust", label: "Rust" },
  { id: "cpp", label: "C++" },
  { id: "python", label: "Python" },
];

export function StatusBar() {
  const workspace = useStore((state) => state.workspace);
  const project = useStore((state) => state.project);
  const git = useStore((state) => state.git);
  const cursor = useStore((state) => state.cursor);
  const activeFile = useStore((state) => state.activeFile);
  const openFiles = useStore((state) => state.openFiles);
  const problems = useStore((state) => state.problems);
  const lspStatus = useStore((state) => state.lspStatus);
  const vimMode = useStore((state) => state.config.editor.vim_mode);
  const bottomVisible = useStore((state) => state.bottomVisible);
  const debugActive = useStore((state) => state.debugActive);
  const debugPaused = useStore((state) => state.debugPaused);

  const active = openFiles.find((file) => file.path === activeFile);
  const model = activeFile ? getModel(activeFile) : null;
  const eol = model?.getEOL() === "\r\n" ? "CRLF" : "LF";
  const errors = problems.filter((problem) => problem.severity === 1).length;
  const warnings = problems.filter((problem) => problem.severity === 2).length;

  return (
    <footer className="statusbar">
      <div className="status-left">
        {workspace && (
          <span className="status-item" title={workspace}>
            {workspace.split(/[\\/]/).filter(Boolean).pop()}
          </span>
        )}
        {project && (
          <span className={`status-item project-kind kind-${project.kind}`}>
            {project.kind === "cpp" ? "C++" : project.kind}
          </span>
        )}
        {git?.is_repo && (
          <button
            className="status-item status-button"
            title="Kaynak kontrolünü aç"
            onClick={() => useStore.getState().setSidebarView("git")}
          >
            <GitBranchIcon size={12} />
            <span>{git.branch || "HEAD"}</span>
            {git.entries.length > 0 && (
              <span className="status-change-count">{git.entries.length}</span>
            )}
          </button>
        )}
        {lspLanguages.map((language) => {
          const status = lspStatus[language.id] ?? "off";
          return (
            <span
              key={language.id}
              className={`status-item lsp-status lsp-${status}`}
              title={`${language.label} dil sunucusu: ${status}`}
            >
              <span className={`lsp-dot ${status}`} />
              {language.label}
            </span>
          );
        })}
        {debugActive && (
          <span className={`status-item debug-status ${debugPaused ? "paused" : "running"}`}>
            {debugPaused ? "Duraklatıldı" : "Hata ayıklanıyor"}
          </span>
        )}
      </div>
      <div className="status-right">
        {activeFile && (
          <>
            <span className="status-item">
              Sat {cursor.line}, Kol {cursor.column}
            </span>
            <span className="status-item">{eol}</span>
            <span className="status-item">UTF-8</span>
            <span className="status-item">{languageLabel(active?.language ?? "plaintext")}</span>
          </>
        )}
        {vimMode && <span className="status-item vim-indicator">VIM</span>}
        <button
          className="status-item status-button"
          title="Sorunlar"
          onClick={() => useStore.getState().toggleBottom("problems")}
        >
          <ErrorIcon size={12} /> {errors}
          <WarningIcon size={12} /> {warnings}
        </button>
        <button
          className={`status-item status-button ${bottomVisible ? "active" : ""}`}
          title="Terminali aç/kapat"
          onClick={() => useStore.getState().toggleBottom("terminal")}
        >
          <TerminalIcon size={12} />
        </button>
        <button
          className="status-item status-button"
          title="Ayarlar"
          onClick={() => useStore.getState().setSettingsOpen(true)}
        >
          <SettingsIcon size={12} />
        </button>
      </div>
    </footer>
  );
}
