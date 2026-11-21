import { useMemo, useState } from "react";
import { useStore } from "../store";
import {
  debugStep,
  evaluateWatch,
  startDebugging,
  stopDebugging,
} from "../services/debugService";
import { relativePath } from "../utils/path";
import {
  BreakpointIcon,
  CloseIcon,
  ContinueIcon,
  PlayIcon,
  PlusIcon,
  RefreshIcon,
  StepIntoIcon,
  StepOutIcon,
  StepOverIcon,
  StopIcon,
  TrashIcon,
} from "./Icons";

export function DebugPanel() {
  const workspace = useStore((state) => state.workspace);
  const project = useStore((state) => state.project);
  const debugActive = useStore((state) => state.debugActive);
  const debugPaused = useStore((state) => state.debugPaused);
  const breakpoints = useStore((state) => state.breakpoints);
  const watches = useStore((state) => state.watches);
  const [watchInput, setWatchInput] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const breakpoint of breakpoints) {
      const lines = map.get(breakpoint.path) ?? [];
      lines.push(breakpoint.line);
      map.set(breakpoint.path, lines);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [breakpoints]);

  if (!workspace) {
    return (
      <div className="empty-panel">
        <p>Hata ayıklamak için bir proje açın.</p>
      </div>
    );
  }

  const addWatch = () => {
    const expression = watchInput.trim();
    if (!expression) return;
    const index = useStore.getState().addWatch(expression);
    setWatchInput("");
    void evaluateWatch(index, expression);
  };

  return (
    <div className="debug-panel">
      <div className="debug-toolbar">
        <button
          className="icon-button"
          title="Hata ayıklamayı başlat"
          disabled={debugActive}
          onClick={() => void startDebugging()}
        >
          <PlayIcon size={16} />
        </button>
        <button
          className="icon-button"
          title="Durdur"
          disabled={!debugActive}
          onClick={() => void stopDebugging()}
        >
          <StopIcon size={16} />
        </button>
        <button
          className="icon-button"
          title="Devam et"
          disabled={!debugActive || !debugPaused}
          onClick={() => void debugStep("continue")}
        >
          <ContinueIcon size={16} />
        </button>
        <button
          className="icon-button"
          title="Adım atla (over)"
          disabled={!debugActive || !debugPaused}
          onClick={() => void debugStep("next")}
        >
          <StepOverIcon size={16} />
        </button>
        <button
          className="icon-button"
          title="İçine gir (into)"
          disabled={!debugActive || !debugPaused}
          onClick={() => void debugStep("stepIn")}
        >
          <StepIntoIcon size={16} />
        </button>
        <button
          className="icon-button"
          title="Dışına çık (out)"
          disabled={!debugActive || !debugPaused}
          onClick={() => void debugStep("stepOut")}
        >
          <StepOutIcon size={16} />
        </button>
      </div>
      <div className={`debug-state ${debugActive ? (debugPaused ? "paused" : "running") : ""}`}>
        {debugActive
          ? debugPaused
            ? "Duraklatıldı"
            : "Çalışıyor…"
          : "Hazır"}
        {project && <span className="debug-project"> · {project.kind}</span>}
      </div>
      {!debugActive && (
        <div className="debug-hint">
          {project?.kind === "rust" || project?.kind === "cpp"
            ? "lldb-dap kullanılır. Yol ayarlardan yapılandırılabilir."
            : project?.kind === "python"
              ? "debugpy kullanılır (python -m debugpy.adapter)."
              : "Proje türü algılanamadı."}
        </div>
      )}

      <div className="section-title">KESME NOKTALARI</div>
      <div className="breakpoint-list">
        {grouped.length === 0 && (
          <div className="empty-panel small">
            Editörde satır numarasına tıklayarak kesme noktası ekleyin.
          </div>
        )}
        {grouped.map(([path, lines]) => (
          <div className="breakpoint-group" key={path}>
            <div className="breakpoint-file" title={path}>
              {relativePath(workspace, path)}
            </div>
            {lines.map((line) => (
              <div className="breakpoint-row" key={`${path}-${line}`}>
                <button
                  className="breakpoint-open"
                  onClick={() => void useStore.getState().openFile(path, line, 1)}
                  title="Satıra git"
                >
                  <BreakpointIcon size={10} />
                  <span>Satır {line}</span>
                </button>
                <button
                  className="icon-button small"
                  title="Kesme noktasını kaldır"
                  onClick={() => useStore.getState().removeBreakpoint(path, line)}
                >
                  <CloseIcon size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
        {breakpoints.length > 0 && (
          <button
            className="small-button"
            onClick={() => useStore.getState().clearBreakpoints()}
          >
            <TrashIcon size={12} /> Tümünü temizle
          </button>
        )}
      </div>

      <div className="section-title">İZLENENLER</div>
      <form
        className="watch-form"
        onSubmit={(event) => {
          event.preventDefault();
          addWatch();
        }}
      >
        <input
          placeholder="İfade ekle…"
          value={watchInput}
          onChange={(event) => setWatchInput(event.target.value)}
        />
        <button className="icon-button small" type="submit" title="Ekle">
          <PlusIcon size={13} />
        </button>
      </form>
      <div className="watch-list">
        {watches.map((watch, index) => (
          <div className="watch-row" key={`${watch.expression}-${index}`}>
            <span className="watch-expression" title={watch.expression}>
              {watch.expression}
            </span>
            <span className={`watch-value ${watch.error ? "error" : ""}`}>
              {watch.value}
            </span>
            <button
              className="icon-button small"
              title="Yeniden değerlendir"
              onClick={() => void evaluateWatch(index, watch.expression)}
            >
              <RefreshIcon size={12} />
            </button>
            <button
              className="icon-button small"
              title="Kaldır"
              onClick={() => useStore.getState().removeWatch(index)}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        ))}
        {watches.length === 0 && (
          <div className="empty-panel small">Henüz izlenen ifade yok.</div>
        )}
      </div>
    </div>
  );
}
