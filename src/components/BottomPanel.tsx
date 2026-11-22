import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { BottomTab } from "../types";
import { TerminalPanel } from "./TerminalPanel";
import { OutputPanel } from "./OutputPanel";
import { ProblemsPanel } from "./ProblemsPanel";
import { DebugConsole } from "./DebugConsole";
import { CloseIcon, ErrorIcon } from "./Icons";

export function BottomPanel() {
  const visible = useStore((state) => state.bottomVisible);
  const tab = useStore((state) => state.bottomTab);
  const problems = useStore((state) => state.problems);
  const initialHeight = useStore(
    (state) => state.config.ui.bottom_panel_height
  );
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    setHeight(initialHeight);
  }, [initialHeight]);

  const errorCount = problems.filter((problem) => problem.severity === 1).length;
  const warningCount = problems.filter(
    (problem) => problem.severity === 2
  ).length;

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const move = (moveEvent: MouseEvent) => {
      const next = startHeight + (startY - moveEvent.clientY);
      setHeight(Math.min(Math.max(next, 120), window.innerHeight * 0.8));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const tabs: { id: BottomTab; label: string; badge?: number }[] = [
    { id: "terminal", label: "Terminal" },
    { id: "output", label: "Output" },
    {
      id: "problems",
      label: "Problems",
      badge: errorCount + warningCount,
    },
    { id: "debug", label: "Debug Console" },
  ];

  return (
    <div
      className="bottom-panel"
      style={{ height, display: visible ? "flex" : "none" }}
    >
      <div className="bottom-resize" onMouseDown={startResize} />
      <div className="bottom-header">
        <div className="bottom-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`bottom-tab ${tab === item.id ? "active" : ""}`}
              onClick={() => useStore.getState().setBottomTab(item.id)}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bottom-badge">
                  {item.id === "problems" && errorCount > 0 && (
                    <ErrorIcon size={10} />
                  )}
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="bottom-actions">
          <button
            className="icon-button small"
            title="Paneli kapat"
            onClick={() => useStore.getState().setBottomVisible(false)}
          >
            <CloseIcon size={13} />
          </button>
        </div>
      </div>
      <div className="bottom-body">
        <div
          className="bottom-view"
          style={{ display: tab === "terminal" ? "flex" : "none" }}
        >
          <TerminalPanel />
        </div>
        {tab === "output" && (
          <div className="bottom-view">
            <OutputPanel />
          </div>
        )}
        {tab === "problems" && (
          <div className="bottom-view">
            <ProblemsPanel />
          </div>
        )}
        {tab === "debug" && (
          <div className="bottom-view">
            <DebugConsole />
          </div>
        )}
      </div>
    </div>
  );
}
