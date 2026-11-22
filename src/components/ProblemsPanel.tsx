import { useMemo, useState } from "react";
import { useStore } from "../store";
import { relativePath } from "../utils/path";
import type { Problem } from "../types";
import { ErrorIcon, InfoIcon, WarningIcon } from "./Icons";

function severityIcon(severity: number) {
  if (severity === 1) return <ErrorIcon size={13} className="severity-error" />;
  if (severity === 2)
    return <WarningIcon size={13} className="severity-warning" />;
  return <InfoIcon size={13} className="severity-info" />;
}

function severityLabel(severity: number): string {
  if (severity === 1) return "Error";
  if (severity === 2) return "Warning";
  return "Bilgi";
}

export function ProblemsPanel() {
  const problems = useStore((state) => state.problems);
  const workspace = useStore((state) => state.workspace);
  const [filter, setFilter] = useState<"all" | "error" | "warning">("all");

  const filtered = useMemo(() => {
    if (filter === "error") return problems.filter((item) => item.severity === 1);
    if (filter === "warning")
      return problems.filter((item) => item.severity === 2);
    return problems;
  }, [problems, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Problem[]>();
    for (const problem of filtered) {
      const list = map.get(problem.path) ?? [];
      list.push(problem);
      map.set(problem.path, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const errors = problems.filter((item) => item.severity === 1).length;
  const warnings = problems.filter((item) => item.severity === 2).length;

  return (
    <div className="problems-panel">
      <div className="problems-toolbar">
        <button
          className={`filter-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({problems.length})
        </button>
        <button
          className={`filter-chip ${filter === "error" ? "active" : ""}`}
          onClick={() => setFilter("error")}
        >
          Errors ({errors})
        </button>
        <button
          className={`filter-chip ${filter === "warning" ? "active" : ""}`}
          onClick={() => setFilter("warning")}
        >
          Warnings ({warnings})
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-panel small">
          {problems.length === 0
            ? "No problems. Results appear here when language servers are ready."
            : "Bu filtreye uyan sorun yok."}
        </div>
      ) : (
        <div className="problems-list">
          {groups.map(([path, items]) => (
            <div className="problem-group" key={path}>
              <div className="problem-file" title={path}>
                {workspace ? relativePath(workspace, path) : path}
              </div>
              {items.map((problem, index) => (
                <button
                  className="problem-row"
                  key={`${path}-${problem.line}-${problem.column}-${index}`}
                  onClick={() =>
                    void useStore
                      .getState()
                      .openFile(problem.path, problem.line, problem.column)
                  }
                  title={`${severityLabel(problem.severity)}: ${problem.message}`}
                >
                  {severityIcon(problem.severity)}
                  <span className="problem-message">{problem.message}</span>
                  <span className="problem-location">
                    {problem.line}:{problem.column}
                  </span>
                  {problem.source && (
                    <span className="problem-source">{problem.source}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
