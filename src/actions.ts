import * as api from "./api";
import { useStore } from "./store";
import { formatActiveDocument } from "./editor/editorService";
import {
  buildProject,
  runProject,
  runTests,
  rustCheck,
  rustClippy,
  rustFmt,
} from "./services/buildService";
import {
  debugStep,
  startDebugging,
  stopDebugging,
} from "./services/debugService";
import { refreshPythonPackages } from "./services/pythonService";
import { lspManager } from "./lsp/LspManager";

export async function openFolder(): Promise<void> {
  try {
    const folder = await api.openFolderDialog();
    if (folder) {
      await useStore.getState().setWorkspace(folder);
    }
  } catch (error) {
    useStore.getState().toast(String(error), "error");
  }
}

export async function reloadConfigFromDisk(): Promise<void> {
  try {
    const config = await api.reloadConfig();
    useStore.getState().applyConfig(config);
    useStore.getState().toast("Settings reloaded.", "success");
  } catch (error) {
    useStore.getState().toast(String(error), "error");
  }
}

export async function openConfigFile(): Promise<void> {
  const { configPath } = useStore.getState();
  if (!configPath) return;
  await useStore.getState().openFile(configPath);
}

export async function runAction(action: string): Promise<void> {
  const store = useStore.getState();
  switch (action) {
    case "save":
      await store.saveActive();
      break;
    case "save_all":
      await store.saveAll();
      break;
    case "close_tab":
      await store.closeActive();
      break;
    case "quick_open":
      store.setQuickOpenOpen(true);
      break;
    case "search":
      store.setSidebarView("search");
      break;
    case "git":
      store.setSidebarView("git");
      break;
    case "problems":
      store.setBottomTab("problems");
      break;
    case "toggle_terminal":
      store.toggleBottom("terminal");
      break;
    case "build":
      await buildProject();
      break;
    case "run":
      await runProject();
      break;
    case "debug":
      await startDebugging();
      break;
    case "stop_debug":
      await stopDebugging();
      break;
    case "debug_continue":
      await debugStep("continue");
      break;
    case "debug_next":
      await debugStep("next");
      break;
    case "debug_step_in":
      await debugStep("stepIn");
      break;
    case "debug_step_out":
      await debugStep("stepOut");
      break;
    case "debug_pause":
      await debugStep("pause");
      break;
    case "format":
      await formatActiveDocument();
      break;
    case "settings":
      store.setSettingsOpen(true);
      break;
    case "new_project":
      store.setNewProjectOpen(true);
      break;
    case "reload_config":
      await reloadConfigFromDisk();
      break;
    case "test":
      await runTests();
      break;
    case "rust_check":
      await rustCheck();
      break;
    case "rust_clippy":
      await rustClippy();
      break;
    case "rust_fmt":
      await rustFmt();
      break;
    case "python_packages":
      store.setSidebarView("python");
      void refreshPythonPackages();
      break;
    case "lsp_restart":
      await lspManager.shutdownAll();
      await lspManager.reopenAll();
      store.toast("Language servers restarted.", "success");
      break;
    default:
      break;
  }
}

export function bindingFor(action: string): string {
  return useStore.getState().config.keybindings[action] ?? "";
}

export function matchesBinding(
  event: KeyboardEvent,
  binding: string
): boolean {
  if (!binding) return false;
  const parts = binding.split("+").map((part) => part.trim());
  if (parts.length === 0) return false;
  const key = parts[parts.length - 1];
  const modifiers = new Set(parts.slice(0, -1).map((part) => part.toLowerCase()));
  const needsCtrl = modifiers.has("ctrl") || modifiers.has("control");
  const needsShift = modifiers.has("shift");
  const needsAlt = modifiers.has("alt") || modifiers.has("option");
  const needsMeta = modifiers.has("meta") || modifiers.has("cmd") || modifiers.has("command");

  if (event.ctrlKey !== needsCtrl) return false;
  if (event.shiftKey !== needsShift) return false;
  if (event.altKey !== needsAlt) return false;
  if (event.metaKey !== needsMeta) return false;

  const eventKey = event.key;
  if (key.length === 1) {
    return eventKey.toLowerCase() === key.toLowerCase();
  }
  return eventKey.toLowerCase() === key.toLowerCase();
}
