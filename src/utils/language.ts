import { baseName } from "./path";

const extensionMap: Record<string, string> = {
  rs: "rust",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "cpp",
  h: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
  py: "python",
  pyi: "python",
  pyw: "python",
  toml: "toml",
  json: "json",
  jsonc: "json",
  md: "markdown",
  markdown: "markdown",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  yaml: "yaml",
  yml: "yaml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",
  cmake: "cmake",
  txt: "plaintext",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  sql: "sql",
  java: "java",
  go: "go",
  lua: "lua",
  lock: "plaintext",
  gitignore: "plaintext",
  env: "plaintext",
};

export function detectLanguage(path: string): string {
  const name = baseName(path).toLowerCase();
  if (name === "cmakelists.txt") return "cmake";
  if (name === "dockerfile") return "dockerfile";
  if (name === "makefile") return "plaintext";
  if (name === ".gitignore" || name === ".env" || name.startsWith(".env.")) {
    return "plaintext";
  }
  if (!name.includes(".")) return "plaintext";
  const extension = name.split(".").pop() ?? "";
  return extensionMap[extension] ?? "plaintext";
}

export function isLspLanguage(language: string): boolean {
  return language === "rust" || language === "cpp" || language === "python";
}

export function languageLabel(language: string): string {
  const labels: Record<string, string> = {
    rust: "Rust",
    cpp: "C++",
    python: "Python",
    toml: "TOML",
    json: "JSON",
    markdown: "Markdown",
    javascript: "JavaScript",
    typescript: "TypeScript",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    xml: "XML",
    yaml: "YAML",
    shell: "Shell",
    powershell: "PowerShell",
    bat: "Batch",
    cmake: "CMake",
    plaintext: "Plain Text",
    dockerfile: "Dockerfile",
    sql: "SQL",
    java: "Java",
    go: "Go",
    lua: "Lua",
    ini: "INI",
    less: "Less",
  };
  return labels[language] ?? language;
}
