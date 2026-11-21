import { useMemo, useState } from "react";
import * as api from "../api";
import { useStore } from "../store";
import { relativePath } from "../utils/path";
import type { SearchMatch } from "../types";
import { SearchIcon } from "./Icons";

export function SearchPanel() {
  const workspace = useStore((state) => state.workspace);
  const excludes = useStore((state) => state.config.explorer.exclude);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, SearchMatch[]>();
    for (const match of results) {
      const list = map.get(match.path) ?? [];
      list.push(match);
      map.set(match.path, list);
    }
    return [...map.entries()];
  }, [results]);

  const runSearch = async () => {
    if (!workspace || !query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setBusy(true);
    try {
      const matches = await api.searchInFiles(
        workspace,
        query.trim(),
        caseSensitive,
        excludes
      );
      setResults(matches);
      setSearched(true);
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!workspace) {
    return (
      <div className="empty-panel">
        <p>Arama yapmak için bir klasör açın.</p>
      </div>
    );
  }

  return (
    <div className="search-panel">
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch();
        }}
      >
        <div className="search-input-row">
          <SearchIcon size={14} />
          <input
            autoFocus
            placeholder="Projede ara…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="search-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(event) => setCaseSensitive(event.target.checked)}
            />
            Büyük/küçük harf
          </label>
          <button className="small-button" type="submit" disabled={busy}>
            {busy ? "Aranıyor…" : "Ara"}
          </button>
        </div>
      </form>
      <div className="search-summary">
        {searched && !busy && (
          <span>
            {results.length} sonuç, {groups.length} dosya
            {results.length >= 800 ? " (sınır)" : ""}
          </span>
        )}
      </div>
      <div className="search-results">
        {groups.map(([path, matches]) => (
          <div className="search-group" key={path}>
            <div className="search-file" title={path}>
              <span className="search-file-name">
                {relativePath(workspace, path)}
              </span>
              <span className="search-file-count">{matches.length}</span>
            </div>
            {matches.map((match, index) => (
              <button
                className="search-hit"
                key={`${path}-${match.line}-${index}`}
                onClick={() =>
                  void useStore
                    .getState()
                    .openFile(match.path, match.line, match.column)
                }
              >
                <span className="search-line">{match.line}</span>
                <span className="search-preview">{match.preview}</span>
              </button>
            ))}
          </div>
        ))}
        {searched && !busy && results.length === 0 && (
          <div className="empty-panel small">Sonuç bulunamadı.</div>
        )}
      </div>
    </div>
  );
}
