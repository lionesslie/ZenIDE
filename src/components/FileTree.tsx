import { useEffect, useMemo, useState } from "react";
import * as api from "../api";
import { useStore } from "../store";
import { openFolder } from "../actions";
import { baseName, dirName, isSubPath, joinPath, pathKey, relativePath } from "../utils/path";
import type { FileEntry, GitEntry } from "../types";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  NewFileIcon,
  NewFolderIcon,
  PencilIcon,
  TrashIcon,
} from "./Icons";

interface ProblemSummary {
  errors: number;
  warnings: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  entry: FileEntry | null;
}

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  gitMap: Map<string, GitEntry>;
  problemMap: Map<string, ProblemSummary>;
  onContextMenu: (event: React.MouseEvent, entry: FileEntry) => void;
  onMove: (source: string, targetDir: string) => Promise<void>;
}

function gitClass(status: string): string {
  switch (status) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "U":
    case "?":
      return "untracked";
    case "M":
    default:
      return "modified";
  }
}

function TreeNode({
  entry,
  depth,
  gitMap,
  problemMap,
  onContextMenu,
  onMove,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const treeVersion = useStore((state) => state.treeVersion);
  const excludes = useStore((state) => state.config.explorer.exclude);
  const activeFile = useStore((state) => state.activeFile);
  const isActive =
    !entry.is_dir &&
    activeFile !== null &&
    pathKey(activeFile) === pathKey(entry.path);
  const gitEntry = gitMap.get(pathKey(entry.path));
  const problems = problemMap.get(pathKey(entry.path));

  const loadChildren = async () => {
    setLoading(true);
    try {
      const entries = await api.listDir(entry.path);
      setChildren(entries.filter((item) => !excludes.includes(item.name)));
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      void loadChildren();
    }
  }, [expanded, treeVersion, excludes]);

  const handleClick = () => {
    if (entry.is_dir) {
      setExpanded((value) => !value);
    } else {
      void useStore.getState().openFile(entry.path);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const source = event.dataTransfer.getData("text/plain");
    if (!source) return;
    const targetDir = entry.is_dir ? entry.path : dirName(entry.path);
    await onMove(source, targetDir);
  };

  return (
    <div>
      <div
        className={`tree-row ${isActive ? "active" : ""}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={handleClick}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event, entry);
        }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", entry.path);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          if (entry.is_dir) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDrop={(event) => void handleDrop(event)}
        title={entry.path}
      >
        {entry.is_dir ? (
          expanded ? (
            <ChevronDownIcon size={12} className="tree-chevron" />
          ) : (
            <ChevronRightIcon size={12} className="tree-chevron" />
          )
        ) : (
          <span className="tree-chevron-spacer" />
        )}
        <span className="tree-icon">
          {entry.is_dir ? (
            expanded ? (
              <FolderOpenIcon size={14} />
            ) : (
              <FolderIcon size={14} />
            )
          ) : (
            <FileIcon size={14} />
          )}
        </span>
        <span className="tree-name">{entry.name}</span>
        {problems && problems.errors > 0 && (
          <span className="tree-problem error" title={`${problems.errors} errors`}>
            {problems.errors}
          </span>
        )}
        {problems && problems.errors === 0 && problems.warnings > 0 && (
          <span className="tree-problem warning" title={`${problems.warnings} warnings`}>
            {problems.warnings}
          </span>
        )}
        {gitEntry && (
          <span
            className={`tree-git git-${gitClass(gitEntry.status)}`}
            title={`Git: ${gitEntry.status}`}
          >
            {gitEntry.status === "?" ? "U" : gitEntry.status}
          </span>
        )}
      </div>
      {entry.is_dir && expanded && (
        <div>
          {loading && (
            <div
              className="tree-loading"
              style={{ paddingLeft: 20 + depth * 12 }}
            >
              loading…
            </div>
          )}
          {!loading &&
            children?.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                gitMap={gitMap}
                problemMap={problemMap}
                onContextMenu={onContextMenu}
                onMove={onMove}
              />
            ))}
          {!loading && children && children.length === 0 && (
            <div
              className="tree-empty"
              style={{ paddingLeft: 20 + depth * 12 }}
            >
              empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const workspace = useStore((state) => state.workspace);
  const treeVersion = useStore((state) => state.treeVersion);
  const excludes = useStore((state) => state.config.explorer.exclude);
  const git = useStore((state) => state.git);
  const problems = useStore((state) => state.problems);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const load = async () => {
    if (!workspace) {
      setEntries([]);
      return;
    }
    try {
      const items = await api.listDir(workspace);
      setEntries(items.filter((item) => !excludes.includes(item.name)));
      setError("");
    } catch (loadError) {
      setError(String(loadError));
      setEntries([]);
    }
  };

  useEffect(() => {
    void load();
  }, [workspace, treeVersion, excludes]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [contextMenu]);

  const gitMap = useMemo(() => {
    const map = new Map<string, GitEntry>();
    if (!workspace || !git?.entries) return map;
    for (const entry of git.entries) {
      map.set(pathKey(joinPath(workspace, entry.path)), entry);
    }
    return map;
  }, [git, workspace]);

  const problemMap = useMemo(() => {
    const map = new Map<string, ProblemSummary>();
    for (const problem of problems) {
      const key = pathKey(problem.path);
      const summary = map.get(key) ?? { errors: 0, warnings: 0 };
      if (problem.severity === 1) summary.errors += 1;
      if (problem.severity === 2) summary.warnings += 1;
      map.set(key, summary);
    }
    return map;
  }, [problems]);

  const refresh = () => {
    useStore.getState().refreshTree();
    void useStore.getState().refreshGit();
  };

  const createNewFile = async (dir: string) => {
    const name = window.prompt("New file name:");
    if (!name?.trim()) return;
    const path = joinPath(dir, name.trim());
    try {
      await api.createFile(path);
      refresh();
      await useStore.getState().openFile(path);
    } catch (createError) {
      useStore.getState().toast(String(createError), "error");
    }
  };

  const createNewFolder = async (dir: string) => {
    const name = window.prompt("New folder name:");
    if (!name?.trim()) return;
    try {
      await api.createDir(joinPath(dir, name.trim()));
      refresh();
    } catch (createError) {
      useStore.getState().toast(String(createError), "error");
    }
  };

  const renameEntry = async (entry: FileEntry) => {
    const name = window.prompt("New name:", entry.name);
    if (!name?.trim() || name.trim() === entry.name) return;
    const target = joinPath(dirName(entry.path), name.trim());
    try {
      await api.renamePath(entry.path, target);
      useStore.getState().updatePaths(entry.path, target);
      refresh();
      await useStore.getState().refreshProject();
    } catch (renameError) {
      useStore.getState().toast(String(renameError), "error");
    }
  };

  const deleteEntry = async (entry: FileEntry) => {
    const confirmed = window.confirm(
      `Delete "${entry.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await api.deletePath(entry.path);
      useStore.getState().handleDeletedPath(entry.path);
      refresh();
      await useStore.getState().refreshProject();
    } catch (deleteError) {
      useStore.getState().toast(String(deleteError), "error");
    }
  };

  const moveEntry = async (source: string, targetDir: string) => {
    if (!workspace) return;
    if (isSubPath(source, targetDir)) return;
    if (pathKey(dirName(source)) === pathKey(targetDir)) return;
    const target = joinPath(targetDir, baseName(source));
    try {
      await api.renamePath(source, target);
      useStore.getState().updatePaths(source, target);
      refresh();
      await useStore.getState().refreshProject();
    } catch (moveError) {
      useStore.getState().toast(String(moveError), "error");
    }
  };

  const openContextMenu = (
    event: React.MouseEvent,
    entry: FileEntry | null
  ) => {
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 220),
      y: Math.min(event.clientY, window.innerHeight - 220),
      entry,
    });
  };

  if (!workspace) {
    return (
      <div className="empty-panel">
        <p>No folder opened yet.</p>
        <button className="primary-button" onClick={() => void openFolder()}>
          Open Folder
        </button>
      </div>
    );
  }

  const contextDir = contextMenu?.entry
    ? contextMenu.entry.is_dir
      ? contextMenu.entry.path
      : dirName(contextMenu.entry.path)
    : workspace;

  return (
    <div
      className="file-tree"
      onContextMenu={(event) => openContextMenu(event, null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const source = event.dataTransfer.getData("text/plain");
        if (source) void moveEntry(source, workspace);
      }}
    >
      {error && <div className="tree-error">{error}</div>}
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          gitMap={gitMap}
          problemMap={problemMap}
          onContextMenu={openContextMenu}
          onMove={moveEntry}
        />
      ))}
      {entries.length === 0 && !error && (
        <div className="tree-empty-root">Folder is empty.</div>
      )}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            className="menu-item"
            onClick={() => {
              setContextMenu(null);
              void createNewFile(contextDir);
            }}
          >
            <NewFileIcon size={14} /> <span>New File</span>
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setContextMenu(null);
              void createNewFolder(contextDir);
            }}
          >
            <NewFolderIcon size={14} /> <span>New Folder</span>
          </button>
          {contextMenu.entry && (
            <>
              <div className="menu-separator" />
              <button
                className="menu-item"
                onClick={() => {
                  const entry = contextMenu.entry;
                  setContextMenu(null);
                  if (entry) void renameEntry(entry);
                }}
              >
                <PencilIcon size={14} /> <span>Rename</span>
              </button>
              <button
                className="menu-item danger"
                onClick={() => {
                  const entry = contextMenu.entry;
                  setContextMenu(null);
                  if (entry) void deleteEntry(entry);
                }}
              >
                <TrashIcon size={14} /> <span>Delete</span>
              </button>
            </>
          )}
          <div className="menu-separator" />
          <div className="menu-hint">
            {contextMenu.entry
              ? relativePath(workspace, contextMenu.entry.path)
              : baseName(workspace)}
          </div>
        </div>
      )}
    </div>
  );
}
