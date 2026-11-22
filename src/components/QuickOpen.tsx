import { useEffect, useRef, useState } from "react";
import * as api from "../api";
import { useStore } from "../store";
import { baseName, relativePath } from "../utils/path";

export function QuickOpen() {
  const open = useStore((state) => state.quickOpenOpen);
  const workspace = useStore((state) => state.workspace);
  const excludes = useStore((state) => state.config.explorer.exclude);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || !workspace) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void api
        .searchFiles(workspace, query.trim(), excludes, 300)
        .then((files) => {
          if (cancelled) return;
          setResults(files);
          setSelected(0);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, query ? 120 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, workspace, excludes]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  const close = () => useStore.getState().setQuickOpenOpen(false);

  const openPath = (path: string) => {
    close();
    void useStore.getState().openFile(path);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) =>
        results.length === 0 ? 0 : (value + 1) % results.length
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) =>
        results.length === 0
          ? 0
          : (value - 1 + results.length) % results.length
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const path = results[selected];
      if (path) openPath(path);
    }
  };

  return (
    <div
      className="overlay overlay-top"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="quick-open">
        <input
          ref={inputRef}
          className="quick-open-input"
          placeholder={
            workspace
              ? "Type a file name… (Esc to close)"
              : "Open a folder first."
          }
          value={query}
          disabled={!workspace}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="quick-open-results" ref={listRef}>
          {loading && <div className="quick-open-hint">Searching…</div>}
          {!loading && workspace && results.length === 0 && (
            <div className="quick-open-hint">No results found.</div>
          )}
          {!loading &&
            results.map((path, index) => (
              <div
                key={path}
                className={`quick-open-item ${
                  index === selected ? "selected" : ""
                }`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => openPath(path)}
                title={path}
              >
                <span className="quick-open-name">{baseName(path)}</span>
                <span className="quick-open-path">
                  {workspace ? relativePath(workspace, path) : path}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
