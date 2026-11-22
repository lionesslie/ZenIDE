import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  CaptureResult,
  FileEntry,
  GitCommit,
  GitStatus,
  ProjectInfo,
  SearchMatch,
  ZenConfig,
} from "./types";

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function call<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauri) {
    throw new Error("ZenIDE runs only as a desktop application.");
  }
  return invoke<T>(command, args);
}

export function onEvent<T>(
  name: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  return listen<T>(name, (event) => handler(event.payload));
}

export const getConfig = () => call<ZenConfig>("get_config");
export const getConfigPath = () => call<string>("get_config_path");
export const saveConfig = (config: ZenConfig) =>
  call<void>("save_config", { config });
export const reloadConfig = () => call<ZenConfig>("reload_config");

export const listDir = (path: string) =>
  call<FileEntry[]>("list_dir", { path });
export const readFile = (path: string) => call<string>("read_file", { path });
export const writeFile = (path: string, content: string) =>
  call<void>("write_file", { path, content });
export const createFile = (path: string) => call<void>("create_file", { path });
export const createDir = (path: string) => call<void>("create_dir", { path });
export const renamePath = (from: string, to: string) =>
  call<void>("rename_path", { from, to });
export const deletePath = (path: string) => call<void>("delete_path", { path });
export const pathExists = (path: string) =>
  call<boolean>("path_exists", { path });
export const homeDir = () => call<string>("home_dir");
export const searchFiles = (
  root: string,
  query: string,
  excludes: string[],
  limit = 500
) => call<string[]>("search_files", { root, query, excludes, limit });
export const searchInFiles = (
  root: string,
  query: string,
  caseSensitive: boolean,
  excludes: string[]
) =>
  call<SearchMatch[]>("search_in_files", {
    root,
    query,
    caseSensitive,
    excludes,
  });

export const detectProject = (root: string) =>
  call<ProjectInfo>("detect_project", { root });
export const createProject = (
  kind: string,
  parent: string,
  name: string,
  pythonPath?: string | null
) => call<string>("create_project", { kind, parent, name, pythonPath });
export const createVenv = (root: string, pythonPath: string) =>
  call<string>("create_venv", { root, pythonPath });

export const runProcess = (
  id: number,
  program: string,
  args: string[],
  cwd?: string | null,
  env?: Record<string, string> | null
) => call<number>("run_process", { id, program, args, cwd, env });
export const killProcess = (id: number) =>
  call<void>("kill_process", { id });
export const runCapture = (
  program: string,
  args: string[],
  cwd?: string | null
) => call<CaptureResult>("run_capture", { program, args, cwd });

export const ptySpawn = (
  id: number,
  cwd: string,
  shell: string,
  cols: number,
  rows: number
) => call<number>("pty_spawn", { id, cwd, shell, cols, rows });
export const ptyWrite = (id: number, data: string) =>
  call<void>("pty_write", { id, data });
export const ptyResize = (id: number, cols: number, rows: number) =>
  call<void>("pty_resize", { id, cols, rows });
export const ptyKill = (id: number) => call<void>("pty_kill", { id });

export const lspStart = (program: string, args: string[], cwd?: string | null) =>
  call<number>("lsp_start", { program, args, cwd });
export const lspSend = (session: number, message: string) =>
  call<void>("lsp_send", { session, message });
export const lspStop = (session: number) =>
  call<void>("lsp_stop", { session });

export const dapStart = (program: string, args: string[], cwd?: string | null) =>
  call<number>("dap_start", { program, args, cwd });
export const dapSend = (session: number, message: string) =>
  call<void>("dap_send", { session, message });
export const dapStop = (session: number) =>
  call<void>("dap_stop", { session });

export const gitStatus = (root: string) =>
  call<GitStatus>("git_status", { root });
export const gitFileHead = (root: string, path: string) =>
  call<string>("git_file_head", { root, path });
export const gitDiff = (root: string, path: string, staged: boolean) =>
  call<string>("git_diff", { root, path, staged });
export const gitLog = (root: string, limit = 20) =>
  call<GitCommit[]>("git_log", { root, limit });
export const gitCommit = (root: string, message: string) =>
  call<string>("git_commit", { root, message });
export const gitPush = (root: string) => call<string>("git_push", { root });
export const gitPull = (root: string) => call<string>("git_pull", { root });
export const gitBranches = (root: string) =>
  call<string[]>("git_branches", { root });
export const gitCheckout = (root: string, branch: string) =>
  call<string>("git_checkout", { root, branch });
export const gitCreateBranch = (root: string, branch: string) =>
  call<string>("git_create_branch", { root, branch });
export const gitInit = (root: string) => call<string>("git_init", { root });

export async function openFolderDialog(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: "Open Folder",
  });
  if (Array.isArray(result)) return result[0] ?? null;
  return result ?? null;
}
