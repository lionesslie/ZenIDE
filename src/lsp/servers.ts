import type { ZenConfig } from "../types";

export interface ServerLaunch {
  command: string;
  args: string[];
}

export function serverForLanguage(
  language: string,
  config: ZenConfig,
  root: string
): ServerLaunch | null {
  if (language === "rust") {
    return {
      command: config.lsp.rust_analyzer_path.trim() || "rust-analyzer",
      args: [...config.lsp.rust_analyzer_args],
    };
  }
  if (language === "cpp") {
    const args = ["--background-index"];
    const buildDir = config.build.cmake_build_dir.trim();
    if (buildDir) {
      args.push(`--compile-commands-dir=${buildDir}`);
    }
    args.push(...config.lsp.clangd_args);
    return {
      command: config.lsp.clangd_path.trim() || "clangd",
      args,
    };
  }
  if (language === "python") {
    if (config.lsp.python_lsp === "pyright") {
      return {
        command: config.lsp.pyright_path.trim() || "pyright-langserver",
        args: ["--stdio"],
      };
    }
    return {
      command: config.lsp.pylsp_path.trim() || "pylsp",
      args: [],
    };
  }
  void root;
  return null;
}
