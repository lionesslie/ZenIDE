import { useState } from "react";
import * as api from "../api";
import { useStore } from "../store";
import { getModel } from "../editor/models";
import { joinPath, pathKey } from "../utils/path";
import type { GitEntry } from "../types";
import {
  GitBranchIcon,
  PlusIcon,
  RefreshIcon,
  ErrorIcon,
} from "./Icons";

function statusClass(status: string): string {
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

function statusLabel(status: string): string {
  switch (status) {
    case "M":
      return "Değiştirildi";
    case "A":
      return "Eklendi";
    case "D":
      return "Silindi";
    case "R":
      return "Yeniden adlandırıldı";
    case "U":
    case "?":
      return "İzlenmiyor";
    default:
      return status;
  }
}

export function GitPanel() {
  const workspace = useStore((state) => state.workspace);
  const git = useStore((state) => state.git);
  const branches = useStore((state) => state.gitBranches);
  const log = useStore((state) => state.gitLog);
  const loading = useStore((state) => state.gitLoading);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!workspace) {
    return (
      <div className="empty-panel">
        <p>Kaynak kontrolü için bir klasör açın.</p>
      </div>
    );
  }

  const refreshAll = async () => {
    const state = useStore.getState();
    await Promise.all([
      state.refreshGit(),
      state.refreshBranches(),
      state.refreshGitLog(),
    ]);
  };

  const openDiff = async (entry: GitEntry) => {
    const fullPath = joinPath(workspace, entry.path);
    setBusy(true);
    try {
      const original = await api
        .gitFileHead(workspace, fullPath)
        .catch(() => "");
      let modified = "";
      if (entry.status !== "D") {
        const openFile = useStore
          .getState()
          .openFiles.find((file) => pathKey(file.path) === pathKey(fullPath));
        const model = openFile ? getModel(fullPath) : null;
        modified = model
          ? model.getValue()
          : await api.readFile(fullPath).catch(() => "");
      }
      useStore.getState().setDiff({
        path: fullPath,
        original,
        modified,
        staged: entry.staged,
      });
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!message.trim()) {
      useStore.getState().toast("Commit mesajı boş olamaz.", "error");
      return;
    }
    setBusy(true);
    try {
      await api.gitCommit(workspace, message.trim());
      setMessage("");
      useStore.getState().toast("Değişiklikler commit'lendi.", "success");
      await refreshAll();
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const pull = async () => {
    setBusy(true);
    try {
      await api.gitPull(workspace);
      useStore.getState().toast("Pull tamamlandı.", "success");
      await refreshAll();
      useStore.getState().refreshTree();
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const push = async () => {
    setBusy(true);
    try {
      await api.gitPush(workspace);
      useStore.getState().toast("Push tamamlandı.", "success");
      await refreshAll();
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const checkout = async (branch: string) => {
    if (!branch || branch === git?.branch) return;
    setBusy(true);
    try {
      await api.gitCheckout(workspace, branch);
      useStore.getState().toast(`Dal değiştirildi: ${branch}`, "success");
      await refreshAll();
      useStore.getState().refreshTree();
      await useStore.getState().refreshProject();
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const createBranch = async () => {
    const name = window.prompt("Yeni dal adı:");
    if (!name?.trim()) return;
    setBusy(true);
    try {
      await api.gitCreateBranch(workspace, name.trim());
      useStore.getState().toast(`Dal oluşturuldu: ${name.trim()}`, "success");
      await refreshAll();
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const initRepo = async () => {
    setBusy(true);
    try {
      await api.gitInit(workspace);
      useStore.getState().toast("Git deposu oluşturuldu.", "success");
      await refreshAll();
    } catch (error) {
      useStore.getState().toast(String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!git || !git.is_repo) {
    return (
      <div className="empty-panel">
        <ErrorIcon size={26} />
        <p>{git?.error ?? "Bu klasör bir git deposu değil."}</p>
        <button className="primary-button" disabled={busy} onClick={() => void initRepo()}>
          Git Deposu Başlat
        </button>
        <button className="small-button" disabled={loading} onClick={() => void refreshAll()}>
          Yenile
        </button>
      </div>
    );
  }

  return (
    <div className="git-panel">
      <div className="git-branch-row">
        <GitBranchIcon size={14} />
        <select
          className="branch-select"
          value={git.branch}
          disabled={busy}
          onChange={(event) => void checkout(event.target.value)}
          title="Dal değiştir"
        >
          {(branches.includes(git.branch) || !git.branch
            ? branches
            : [git.branch, ...branches]
          ).map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        <button className="icon-button small" title="Yeni dal" onClick={() => void createBranch()}>
          <PlusIcon size={13} />
        </button>
        <button
          className="icon-button small"
          title="Yenile"
          onClick={() => void refreshAll()}
        >
          <RefreshIcon size={13} />
        </button>
      </div>
      <div className="git-sync-row">
        <button className="small-button" disabled={busy} onClick={() => void pull()}>
          Pull
        </button>
        <button className="small-button" disabled={busy} onClick={() => void push()}>
          Push
        </button>
        <span className="git-sync-info">
          {git.entries.length} değişiklik
        </span>
      </div>
      <div className="git-changes">
        {git.entries.length === 0 && (
          <div className="empty-panel small">Değişiklik yok.</div>
        )}
        {git.entries.map((entry) => (
          <div
            className="git-entry"
            key={`${entry.path}-${entry.index}-${entry.worktree}`}
            onClick={() => void openDiff(entry)}
            title={`${statusLabel(entry.status)} — ${entry.path}`}
          >
            <span className={`git-status git-${statusClass(entry.status)}`}>
              {entry.status === "?" ? "U" : entry.status}
            </span>
            <span className="git-path">{entry.path}</span>
            {entry.staged && <span className="git-staged" title="Sahnelendi">S</span>}
          </div>
        ))}
      </div>
      <div className="git-commit-box">
        <textarea
          placeholder="Commit mesajı…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
        />
        <button
          className="primary-button"
          disabled={busy || !message.trim() || git.entries.length === 0}
          onClick={() => void commit()}
        >
          Commit'le (tümü)
        </button>
      </div>
      <div className="git-log">
        <div className="section-title">GEÇMİŞ</div>
        {log.length === 0 && <div className="empty-panel small">Commit geçmişi yok.</div>}
        {log.map((commit) => (
          <div className="git-log-entry" key={commit.hash} title={commit.message}>
            <span className="git-log-hash">{commit.hash}</span>
            <span className="git-log-message">{commit.message}</span>
            <span className="git-log-meta">
              {commit.author} · {commit.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
