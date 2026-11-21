import * as api from "../api";
import { useStore } from "../store";
import { baseName, joinPath } from "../utils/path";
import { runTask } from "./taskService";
import { pythonExecutable } from "./pythonService";

function isAbsolutePath(path: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(path) ||
    path.startsWith("/") ||
    path.startsWith("\\\\")
  );
}

function resolveProgram(root: string, program: string): string {
  return isAbsolutePath(program) ? program : joinPath(root, program);
}

export async function buildProject(): Promise<void> {
  const { workspace, project, config } = useStore.getState();
  if (!workspace) {
    useStore.getState().toast("Önce bir proje açın.", "error");
    return;
  }
  const kind = project?.kind ?? "unknown";

  if (kind === "rust") {
    await runTask(
      "cargo build",
      "cargo",
      ["build", ...config.build.cargo_extra_args],
      workspace
    );
    await useStore.getState().refreshProject();
    return;
  }

  if (kind === "cpp") {
    const buildDir = config.build.cmake_build_dir.trim() || "build";
    const cacheFile = joinPath(joinPath(workspace, buildDir), "CMakeCache.txt");
    const hasCache = await api.pathExists(cacheFile);
    if (!hasCache) {
      const configureCode = await runTask(
        "cmake configure",
        "cmake",
        ["-S", ".", "-B", buildDir, ...config.build.cmake_extra_args],
        workspace
      );
      if (configureCode !== 0) return;
    }
    await runTask(
      "cmake build",
      "cmake",
      ["--build", buildDir],
      workspace
    );
    await useStore.getState().refreshProject();
    return;
  }

  if (kind === "python") {
    const python = pythonExecutable(config, project);
    const active = useStore.getState().activeFile;
    if (active && active.toLowerCase().endsWith(".py")) {
      await runTask(
        "python check",
        python,
        ["-m", "py_compile", active],
        workspace
      );
    } else {
      await runTask(
        "python check",
        python,
        ["-m", "compileall", "-q", "."],
        workspace
      );
    }
    return;
  }

  useStore
    .getState()
    .toast(
      "Proje türü algılanamadı (Cargo.toml, CMakeLists.txt veya Python dosyası gerekli).",
      "error"
    );
}

export async function runProject(): Promise<void> {
  const state = useStore.getState();
  const { workspace, project, config } = state;
  if (!workspace) {
    state.toast("Önce bir proje açın.", "error");
    return;
  }
  const kind = project?.kind ?? "unknown";

  if (kind === "rust") {
    await runTask(
      "cargo run",
      "cargo",
      ["run", ...config.build.cargo_extra_args],
      workspace
    );
    return;
  }

  if (kind === "cpp") {
    await buildProject();
    const refreshed = useStore.getState().project;
    const configured = config.debug.cpp_program.trim();
    const program = configured || refreshed?.executable || "";
    if (!program) {
      useStore
        .getState()
        .toast(
          "Çalıştırılabilir dosya bulunamadı. CMake hedefini kontrol edin.",
          "error"
        );
      return;
    }
    const executable = resolveProgram(workspace, program);
    await runTask(
      `Çalıştır: ${baseName(executable)}`,
      executable,
      [],
      workspace
    );
    return;
  }

  if (kind === "python") {
    const python = pythonExecutable(config, project);
    const active = useStore.getState().activeFile;
    const script =
      active && active.toLowerCase().endsWith(".py")
        ? active
        : joinPath(workspace, "main.py");
    await runTask(
      "python run",
      python,
      [script, ...config.build.python_extra_args],
      workspace
    );
    return;
  }

  state.toast("Proje türü algılanamadı.", "error");
}

export async function runTests(): Promise<void> {
  const { workspace, project, config } = useStore.getState();
  if (!workspace) return;
  const kind = project?.kind ?? "unknown";
  if (kind === "rust") {
    await runTask("cargo test", "cargo", ["test"], workspace);
  } else if (kind === "cpp") {
    const buildDir = config.build.cmake_build_dir.trim() || "build";
    await runTask(
      "ctest",
      "ctest",
      ["--test-dir", buildDir, "--output-on-failure"],
      workspace
    );
  } else if (kind === "python") {
    const python = pythonExecutable(config, project);
    await runTask("pytest", python, ["-m", "pytest"], workspace);
  }
}

export async function rustCheck(): Promise<void> {
  const { workspace } = useStore.getState();
  if (!workspace) return;
  await runTask("cargo check", "cargo", ["check"], workspace);
}

export async function rustClippy(): Promise<void> {
  const { workspace } = useStore.getState();
  if (!workspace) return;
  await runTask("cargo clippy", "cargo", ["clippy"], workspace);
}

export async function rustFmt(): Promise<void> {
  const { workspace } = useStore.getState();
  if (!workspace) return;
  await runTask("cargo fmt", "cargo", ["fmt"], workspace);
  await useStore.getState().refreshProject();
}
