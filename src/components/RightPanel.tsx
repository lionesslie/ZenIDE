import { useState } from "react";
import { useStore } from "../store";
import type { OutlineSymbol } from "../types";
import { ChevronDownIcon, ChevronRightIcon, CloseIcon } from "./Icons";
import { VariablesView } from "./VariablesView";

function OutlineNode({
  symbol,
  depth,
  file,
}: {
  symbol: OutlineSymbol;
  depth: number;
  file: string;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children = symbol.children ?? [];
  return (
    <div>
      <div
        className="outline-row"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() =>
          void useStore
            .getState()
            .openFile(file, symbol.line, symbol.column)
        }
        title={symbol.detail ? `${symbol.name} — ${symbol.detail}` : symbol.name}
      >
        {children.length > 0 ? (
          <button
            className="outline-toggle"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? (
              <ChevronDownIcon size={11} />
            ) : (
              <ChevronRightIcon size={11} />
            )}
          </button>
        ) : (
          <span className="outline-toggle-spacer" />
        )}
        <span className="outline-name">{symbol.name}</span>
        {symbol.detail && (
          <span className="outline-detail">{symbol.detail}</span>
        )}
      </div>
      {expanded &&
        children.map((child, index) => (
          <OutlineNode
            key={`${child.name}-${child.line}-${index}`}
            symbol={child}
            depth={depth + 1}
            file={file}
          />
        ))}
    </div>
  );
}

export function RightPanel() {
  const view = useStore((state) => state.rightView);
  const outline = useStore((state) => state.outline);
  const activeFile = useStore((state) => state.activeFile);
  const width = useStore((state) => state.config.ui.right_panel_width);

  return (
    <div className="right-panel" style={{ width }}>
      <div className="right-header">
        <div className="right-tabs">
          <button
            className={`right-tab ${view === "outline" ? "active" : ""}`}
            onClick={() => useStore.getState().setRightView("outline")}
          >
            Ana Hat
          </button>
          <button
            className={`right-tab ${view === "variables" ? "active" : ""}`}
            onClick={() => useStore.getState().setRightView("variables")}
          >
            Değişkenler
          </button>
        </div>
        <button
          className="icon-button small"
          title="Paneli kapat"
          onClick={() => useStore.getState().setRightPanelVisible(false)}
        >
          <CloseIcon size={13} />
        </button>
      </div>
      <div className="right-body">
        {view === "outline" ? (
          !activeFile ? (
            <div className="empty-panel small">
              Ana hat için bir dosya açın.
            </div>
          ) : outline.length === 0 ? (
            <div className="empty-panel small">
              Sembol bulunamadı. Dil sunucusu hazır olduğunda tekrar deneyin.
            </div>
          ) : (
            <div className="outline-view">
              {outline.map((symbol, index) => (
                <OutlineNode
                  key={`${symbol.name}-${symbol.line}-${index}`}
                  symbol={symbol}
                  depth={0}
                  file={activeFile}
                />
              ))}
            </div>
          )
        ) : (
          <VariablesView />
        )}
      </div>
    </div>
  );
}
