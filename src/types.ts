export interface EditorConfig {
  font_family: string;
  font_size: number;
  tab_size: number;
  vim_mode: boolean;
  word_wrap: boolean;
  minimap: boolean;
  line_numbers: boolean;
}

export interface ThemeConfig {
  background: string;
  panel: string;
  border: string;
  text: string;
  accent: string;
  editor_background: string;
}

export interface UiConfig {
  sidebar_width: number;
  bottom_panel_height: number;
  right_panel_width: number;
  show_right_panel: boolean;
}

export interface TerminalConfig {
  shell: string;
  font_family: string;
  font_size: number;
  scrollback: number;
}

export interface LspConfig {
  rust_analyzer_path: string;
  rust_analyzer_args: string[];
  clangd_path: string;
  clangd_args: string[];
  python_lsp: string;
  pylsp_path: string;
  pyright_path: string;
  python_path: string;
}

export interface BuildConfig {
  cargo_extra_args: string[];
  cmake_extra_args: string[];
  python_extra_args: string[];
  cmake_build_dir: string;
}

export interface DebugConfig {
  lldb_dap_path: string;
  debugpy_path: string;
  rust_program: string;
  cpp_program: string;
}

export interface ExplorerConfig {
  exclude: string[];
}

export interface ZenConfig {
  editor: EditorConfig;
  theme: ThemeConfig;
  ui: UiConfig;
  terminal: TerminalConfig;
  lsp: LspConfig;
  build: BuildConfig;
  debug: DebugConfig;
  explorer: ExplorerConfig;
  keybindings: Record<string, string>;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface OpenFile {
  path: string;
  language: string;
  dirty: boolean;
}

export interface Problem {
  path: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: number;
  source?: string;
}

export interface GitEntry {
  path: string;
  status: string;
  staged: boolean;
  index: string;
  worktree: string;
}

export interface GitStatus {
  is_repo: boolean;
  branch: string;
  entries: GitEntry[];
  error?: string | null;
}

export interface GitCommit {
  hash: string;
  author: string;
  message: string;
  date: string;
}

export interface ProjectInfo {
  kind: "rust" | "cpp" | "python" | "unknown" | string;
  name: string;
  path: string;
  venv?: string | null;
  python?: string | null;
  executable?: string | null;
}

export interface TaskInfo {
  id: number;
  name: string;
  output: string;
  running: boolean;
  code?: number | null;
}

export interface Breakpoint {
  path: string;
  line: number;
}

export interface StackFrame {
  id: number;
  name: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface DebugVariable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export interface DebugScope {
  name: string;
  variablesReference: number;
  variables: DebugVariable[];
}

export interface WatchItem {
  expression: string;
  value: string;
  error?: boolean;
}

export interface OutlineSymbol {
  name: string;
  detail?: string;
  kind: number;
  line: number;
  column: number;
  children?: OutlineSymbol[];
}

export interface DiffData {
  path: string;
  original: string;
  modified: string;
  staged: boolean;
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  preview: string;
}

export interface CaptureResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface ToastItem {
  id: number;
  message: string;
  kind: "info" | "success" | "error";
}

export type SidebarView = "explorer" | "search" | "git" | "debug" | "python";
export type BottomTab = "terminal" | "output" | "problems" | "debug";
export type LspStatus = "off" | "starting" | "ready" | "error";
