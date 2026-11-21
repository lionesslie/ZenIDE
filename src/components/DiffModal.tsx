import { useEffect, useMemo } from "react";
import { useStore } from "../store";
import { relativePath } from "../utils/path";
import type { DiffData } from "../types";
import { CloseIcon } from "./Icons";

interface DiffRow {
  type: "same" | "add" | "del";
  oldLine?: number;
  newLine?: number;
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffRow[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const n = oldLines.length;
  const m = newLines.length;
  const rows: DiffRow[] = [];

  if (n * m > 4_000_000) {
    let prefix = 0;
    while (
      prefix < n &&
      prefix < m &&
      oldLines[prefix] === newLines[prefix]
    ) {
      rows.push({ type: "same", oldLine: prefix + 1, newLine: prefix + 1, text: oldLines[prefix] });
      prefix += 1;
    }
    let suffix = 0;
    while (
      suffix < n - prefix &&
      suffix < m - prefix &&
      oldLines[n - 1 - suffix] === newLines[m - 1 - suffix]
    ) {
      suffix += 1;
    }
    for (let index = prefix; index < n - suffix; index += 1) {
      rows.push({ type: "del", oldLine: index + 1, text: oldLines[index] });
    }
    for (let index = prefix; index < m - suffix; index += 1) {
      rows.push({ type: "add", newLine: index + 1, text: newLines[index] });
    }
    for (let index = 0; index < suffix; index += 1) {
      const oldIndex = n - suffix + index;
      const newIndex = m - suffix + index;
      rows.push({
        type: "same",
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
        text: oldLines[oldIndex],
      });
    }
    return rows;
  }

  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        oldLines[i] === newLines[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      rows.push({ type: "same", oldLine: i + 1, newLine: j + 1, text: oldLines[i] });
      i += 1;
      j += 1;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      rows.push({ type: "del", oldLine: i + 1, text: oldLines[i] });
      i += 1;
    } else {
      rows.push({ type: "add", newLine: j + 1, text: newLines[j] });
      j += 1;
    }
  }
  while (i < n) {
    rows.push({ type: "del", oldLine: i + 1, text: oldLines[i] });
    i += 1;
  }
  while (j < m) {
    rows.push({ type: "add", newLine: j + 1, text: newLines[j] });
    j += 1;
  }
  return rows;
}

function DiffDialog({ diff }: { diff: DiffData }) {
  const workspace = useStore((state) => state.workspace);
  const rows = useMemo(
    () => computeDiff(diff.original, diff.modified),
    [diff]
  );
  const additions = rows.filter((row) => row.type === "add").length;
  const deletions = rows.filter((row) => row.type === "del").length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useStore.getState().closeDiff();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          useStore.getState().closeDiff();
        }
      }}
    >
      <div className="diff-modal">
        <div className="diff-header">
          <div className="diff-title">
            <span className="diff-path" title={diff.path}>
              {workspace ? relativePath(workspace, diff.path) : diff.path}
            </span>
            <span className={`diff-badge ${diff.staged ? "staged" : ""}`}>
              {diff.staged ? "Sahnelendi" : "Çalışma ağacı"}
            </span>
          </div>
          <div className="diff-stats">
            <span className="diff-additions">+{additions}</span>
            <span className="diff-deletions">−{deletions}</span>
          </div>
          <button
            className="icon-button small"
            title="Kapat"
            onClick={() => useStore.getState().closeDiff()}
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="diff-body">
          {rows.map((row, index) => (
            <div className={`diff-row ${row.type}`} key={index}>
              <span className="diff-line-old">{row.oldLine ?? ""}</span>
              <span className="diff-line-new">{row.newLine ?? ""}</span>
              <span className="diff-sign">
                {row.type === "add" ? "+" : row.type === "del" ? "−" : " "}
              </span>
              <span className="diff-text">{row.text || " "}</span>
            </div>
          ))}
        </div>
        <div className="diff-footer">
          <span className="welcome-muted">
            HEAD ile çalışma ağacı karşılaştırması
          </span>
        </div>
      </div>
    </div>
  );
}

export function DiffModal() {
  const diff = useStore((state) => state.diff);
  if (!diff) return null;
  return <DiffDialog diff={diff} />;
}
