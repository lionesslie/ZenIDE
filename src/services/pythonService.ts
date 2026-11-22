import * as api from "../api";
import { useStore } from "../store";
import type { ProjectInfo, ZenConfig } from "../types";

export function pythonExecutable(
  config: ZenConfig,
  project: ProjectInfo | null
): string {
  return config.lsp.python_path.trim() || project?.python || "python";
}

export async function refreshPythonPackages(
  silent = false
): Promise<void> {
  const { workspace, project, config } = useStore.getState();
  if (!workspace) return;
  const python = pythonExecutable(config, project);
  useStore.getState().setPythonLoading(true);
  try {
    const result = await api.runCapture(
      python,
      ["-m", "pip", "list", "--format=json"],
      workspace
    );
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || "pip list could not be run.");
    }
    const parsed = JSON.parse(result.stdout || "[]");
    const packages = (Array.isArray(parsed) ? parsed : [])
      .map((item: any) => ({
        name: String(item.name ?? ""),
        version: String(item.version ?? ""),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    useStore.getState().setPythonPackages(packages);
  } catch (error) {
    useStore.getState().setPythonPackages([]);
    if (!silent) {
      useStore.getState().toast(String(error), "error");
    }
  } finally {
    useStore.getState().setPythonLoading(false);
  }
}

export async function installPythonPackage(name: string): Promise<boolean> {
  const { workspace, project, config } = useStore.getState();
  if (!workspace || !name.trim()) return false;
  const python = pythonExecutable(config, project);
  const store = useStore.getState();
  store.setPythonLoading(true);
  try {
    const result = await api.runCapture(
      python,
      ["-m", "pip", "install", name.trim()],
      workspace
    );
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || "Package could not be installed.");
    }
    store.toast(`Paket kuruldu: ${name.trim()}`, "success");
    await refreshPythonPackages(true);
    return true;
  } catch (error) {
    store.toast(String(error), "error");
    return false;
  } finally {
    store.setPythonLoading(false);
  }
}

export async function uninstallPythonPackage(
  name: string
): Promise<boolean> {
  const { workspace, project, config } = useStore.getState();
  if (!workspace || !name.trim()) return false;
  const python = pythonExecutable(config, project);
  const store = useStore.getState();
  store.setPythonLoading(true);
  try {
    const result = await api.runCapture(
      python,
      ["-m", "pip", "uninstall", "-y", name.trim()],
      workspace
    );
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || "Package could not be removed.");
    }
    store.toast(`Package removed: ${name}`, "success");
    await refreshPythonPackages(true);
    return true;
  } catch (error) {
    store.toast(String(error), "error");
    return false;
  } finally {
    store.setPythonLoading(false);
  }
}

export async function createProjectVenv(): Promise<void> {
  const { workspace, config } = useStore.getState();
  if (!workspace) return;
  const store = useStore.getState();
  store.setPythonLoading(true);
  try {
    const python = config.lsp.python_path.trim() || "python";
    const result = await api.createVenv(workspace, python);
    store.toast(`Virtual environment ready: ${result}`, "success");
    await store.refreshProject();
    await refreshPythonPackages(true);
  } catch (error) {
    store.toast(String(error), "error");
  } finally {
    store.setPythonLoading(false);
  }
}
