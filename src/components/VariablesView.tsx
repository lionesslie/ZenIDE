import { useState } from "react";
import { useStore } from "../store";
import { fetchVariables } from "../services/debugService";
import type { DebugVariable } from "../types";
import { ChevronDownIcon, ChevronRightIcon } from "./Icons";

function VariableRow({
  variable,
  depth,
}: {
  variable: DebugVariable;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DebugVariable[] | null>(null);
  const [loading, setLoading] = useState(false);
  const expandable = variable.variablesReference > 0;

  const toggle = async () => {
    if (!expandable) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!children) {
      setLoading(true);
      try {
        const vars = await fetchVariables(variable.variablesReference);
        setChildren(vars);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  };

  return (
    <div>
      <div
        className={`variable-row ${expandable ? "expandable" : ""}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => void toggle()}
      >
        {expandable ? (
          expanded ? (
            <ChevronDownIcon size={11} />
          ) : (
            <ChevronRightIcon size={11} />
          )
        ) : (
          <span className="variable-spacer" />
        )}
        <span className="variable-name">{variable.name}</span>
        <span className="variable-value" title={variable.value}>
          {variable.value}
        </span>
        {variable.type && <span className="variable-type">{variable.type}</span>}
      </div>
      {expanded && loading && (
        <div
          className="variable-loading"
          style={{ paddingLeft: 24 + depth * 12 }}
        >
          loading…
        </div>
      )}
      {expanded &&
        !loading &&
        children?.map((child, index) => (
          <VariableRow
            key={`${child.name}-${index}`}
            variable={child}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function VariablesView() {
  const scopes = useStore((state) => state.debugScopes);
  const debugActive = useStore((state) => state.debugActive);

  if (!debugActive) {
    return (
      <div className="empty-panel small">
        Start a debug session to see variables.
      </div>
    );
  }

  if (scopes.length === 0) {
    return (
      <div className="empty-panel small">
        No variables. Scopes appear here when paused.
      </div>
    );
  }

  return (
    <div className="variables-view">
      {scopes.map((scope) => (
        <div className="scope-group" key={`${scope.name}-${scope.variablesReference}`}>
          <div className="scope-title">{scope.name}</div>
          {scope.variables.length === 0 && (
            <div className="empty-panel small">Empty scope.</div>
          )}
          {scope.variables.map((variable, index) => (
            <VariableRow
              key={`${variable.name}-${index}`}
              variable={variable}
              depth={0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
