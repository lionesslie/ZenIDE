import * as api from "../api";
import { on } from "../bus";
import { useStore } from "../store";
import { DapClient } from "../debug/DapClient";
import { joinPath } from "../utils/path";
import type { Breakpoint, DebugVariable, StackFrame } from "../types";

let dap: DapClient | null = null;
let initPromise: Promise<void> | null = null;
let lastBreakpointPaths = new Set<string>();

function mapVariables(variables: any[]): DebugVariable[] {
  return (variables ?? []).map((variable: any) => ({
    name: variable.name ?? "?",
    value: variable.value ?? "",
    type: variable.type,
    variablesReference: variable.variablesReference ?? 0,
  }));
}

function isAbsolutePath(path: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(path) ||
    path.startsWith("/") ||
    path.startsWith("\\\\")
  );
}

export function initDebugService(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    on("breakpoints-changed", (breakpoints: Breakpoint[]) => {
      if (dap && useStore.getState().debugActive) {
        void syncBreakpoints(breakpoints);
      }
    });
    await api.onEvent<{ session: number }>("dap-exit", (payload) => {
      const client = dap;
      if (!client || client.session !== payload.session) return;
      dap = null;
      lastBreakpointPaths.clear();
      client.failPending();
      useStore.getState().resetDebug();
      useStore.getState().toast("Debug session ended.", "info");
    });
  })();
  return initPromise;
}

async function syncBreakpoints(breakpoints: Breakpoint[]): Promise<void> {
  const client = dap;
  if (!client) return;
  const grouped = new Map<string, number[]>();
  for (const breakpoint of breakpoints) {
    const lines = grouped.get(breakpoint.path) ?? [];
    lines.push(breakpoint.line);
    grouped.set(breakpoint.path, lines);
  }
  const requests: Promise<any>[] = [];
  for (const [path, lines] of grouped) {
    requests.push(
      client
        .request("setBreakpoints", {
          source: { path },
          breakpoints: lines.map((line) => ({ line })),
          sourceModified: false,
        })
        .catch(() => null)
    );
  }
  for (const path of lastBreakpointPaths) {
    if (!grouped.has(path)) {
      requests.push(
        client
          .request("setBreakpoints", {
            source: { path },
            breakpoints: [],
            sourceModified: false,
          })
          .catch(() => null)
      );
    }
  }
  lastBreakpointPaths = new Set(grouped.keys());
  await Promise.all(requests);
}

async function loadScopes(frameId: number): Promise<void> {
  const client = dap;
  if (!client) return;
  try {
    const scopesResult = await client.request("scopes", { frameId });
    const scopes = [];
    for (const scope of scopesResult.scopes ?? []) {
      if (!scope.variablesReference) {
        scopes.push({
          name: scope.name,
          variablesReference: 0,
          variables: [],
        });
        continue;
      }
      try {
        const variablesResult = await client.request("variables", {
          variablesReference: scope.variablesReference,
        });
        scopes.push({
          name: scope.name,
          variablesReference: scope.variablesReference,
          variables: mapVariables(variablesResult.variables),
        });
      } catch {
        scopes.push({
          name: scope.name,
          variablesReference: scope.variablesReference,
          variables: [],
        });
      }
    }
    useStore.getState().setDebugScopes(scopes);
  } catch (error) {
    console.debug("Could not get scopes", error);
  }
}

async function refreshStopped(threadId?: number): Promise<void> {
  const client = dap;
  if (!client) return;
  try {
    let thread = threadId ?? useStore.getState().debugThreadId;
    if (!thread) {
      const threads = await client.request("threads", {});
      thread = threads.threads?.[0]?.id ?? null;
    }
    if (!thread) return;
    useStore.getState().setDebugThread(thread);
    const stack = await client.request("stackTrace", {
      threadId: thread,
      startFrame: 0,
      levels: 25,
    });
    const frames: StackFrame[] = (stack.stackFrames ?? []).map(
      (frame: any) => ({
        id: frame.id,
        name: frame.name ?? "?",
        file: frame.source?.path,
        line: frame.line,
        column: frame.column,
      })
    );
    useStore.getState().setDebugFrames(frames);
    const first = frames[0];
    if (first) {
      useStore.getState().setDebugSelectedFrame(first.id);
      if (first.file) {
        void useStore.getState().openFile(first.file, first.line, first.column);
      }
      await loadScopes(first.id);
    }
  } catch (error) {
    console.debug("Could not get pause info", error);
  }
}

async function handleEvent(event: string, body: any): Promise<void> {
  const store = useStore.getState();
  if (event === "output") {
    store.appendDebugOutput(body.output ?? "");
    return;
  }
  if (event === "stopped") {
    store.setDebugPaused(true);
    if (body.threadId) store.setDebugThread(body.threadId);
    await refreshStopped(body.threadId);
    return;
  }
  if (event === "continued") {
    store.setDebugPaused(false);
    store.setDebugFrames([]);
    store.setDebugScopes([]);
    return;
  }
  if (event === "terminated" || event === "exited") {
    if (!dap) return;
    const client = dap;
    dap = null;
    lastBreakpointPaths.clear();
    try {
      await client.stop();
    } catch {
      // ignore
    }
    useStore.getState().resetDebug();
    useStore.getState().toast("Debug session ended.", "info");
  }
}

export async function startDebugging(): Promise<void> {
  await initDebugService();
  const state = useStore.getState();
  if (!state.workspace) {
    state.toast("Open a project first to debug.", "error");
    return;
  }
  if (dap) {
    await stopDebugging();
  }
  let project = state.project;
  if (!project || project.kind === "unknown") {
    try {
      project = await api.detectProject(state.workspace);
      useStore.setState({ project });
    } catch {
      // ignore
    }
  }
  if (!project) {
    state.toast("Project could not be detected.", "error");
    return;
  }

  const kind = project.kind;
  let command = "";
  let args: string[] = [];
  let launchArgs: any = { cwd: state.workspace };

  if (kind === "rust" || kind === "cpp") {
    const configured =
      kind === "rust"
        ? state.config.debug.rust_program.trim()
        : state.config.debug.cpp_program.trim();
    let program = configured || project.executable || "";
    if (!program) {
      state.toast(
        "Executable not found. Build the project first.",
        "error"
      );
      return;
    }
    if (!isAbsolutePath(program)) {
      program = joinPath(state.workspace, program);
    }
    command = state.config.debug.lldb_dap_path.trim() || "lldb-dap";
    args = [];
    launchArgs = {
      program,
      cwd: state.workspace,
      stopOnEntry: false,
      sourceLanguages: [kind === "rust" ? "rust" : "cpp"],
    };
  } else if (kind === "python") {
    const active =
      state.activeFile && state.activeFile.toLowerCase().endsWith(".py")
        ? state.activeFile
        : joinPath(state.workspace, "main.py");
    const python =
      state.config.debug.debugpy_path.trim() ||
      state.config.lsp.python_path.trim() ||
      project.python ||
      "python";
    command = python;
    args = ["-m", "debugpy.adapter"];
    launchArgs = {
      program: active,
      cwd: state.workspace,
      console: "internalConsole",
      justMyCode: true,
      stopOnEntry: false,
      subProcess: true,
    };
  } else {
    state.toast("Debugging is not supported for this project type.", "error");
    return;
  }

  const client = new DapClient();
  client.onEvent((event, body) => {
    void handleEvent(event, body);
  });

  try {
    await client.start(command, args, state.workspace);
  } catch (error) {
    state.toast(String(error), "error");
    return;
  }

  dap = client;
  lastBreakpointPaths.clear();
  const store = useStore.getState();
  store.setDebugActive(true);
  store.setDebugPaused(false);
  store.setDebugFrames([]);
  store.setDebugScopes([]);
  store.setDebugThread(null);
  store.setDebugSelectedFrame(null);
  store.clearDebugOutput();
  store.setBottomTab("debug");

  try {
    const initializedEvent = client.waitForEvent("initialized", 8000);
    await client.request(
      "initialize",
      {
        clientID: "zenide",
        clientName: "ZenIDE",
        adapterID: kind === "python" ? "debugpy" : "lldb-dap",
        pathFormat: "path",
        linesStartAt1: true,
        columnsStartAt1: true,
        supportsVariableType: true,
        supportsVariablePaging: false,
        supportsRunInTerminalRequest: false,
      },
      30_000
    );
    await initializedEvent;
    await syncBreakpoints(useStore.getState().breakpoints);
    void client.request("launch", launchArgs, 90_000).catch((error) => {
      useStore
        .getState()
        .toast(`Could not start debugging: ${error.message}`, "error");
      void stopDebugging();
    });
    await client.request("configurationDone", {}, 30_000).catch(() => null);
    useStore.getState().toast("Debug session started.", "info");
  } catch (error) {
    useStore
      .getState()
      .toast(`DAP startup error: ${(error as Error).message}`, "error");
    await stopDebugging();
  }
}

export async function stopDebugging(): Promise<void> {
  const client = dap;
  dap = null;
  lastBreakpointPaths.clear();
  if (client) {
    try {
      await client.request(
        "disconnect",
        { terminateDebuggee: true },
        4000
      );
    } catch {
      // adapter may not respond
    }
    try {
      await client.stop();
    } catch {
      // ignore
    }
  }
  useStore.getState().resetDebug();
}

export async function debugStep(
  command: "continue" | "next" | "stepIn" | "stepOut" | "pause"
): Promise<void> {
  if (!dap) return;
  const threadId = useStore.getState().debugThreadId ?? 1;
  try {
    await dap.request(command, { threadId });
    if (command === "continue") {
      useStore.getState().setDebugPaused(false);
    }
  } catch (error) {
    useStore.getState().toast(String(error), "error");
  }
}

export async function selectFrame(frame: StackFrame): Promise<void> {
  const store = useStore.getState();
  store.setDebugSelectedFrame(frame.id);
  if (frame.file) {
    void store.openFile(frame.file, frame.line, frame.column);
  }
  await loadScopes(frame.id);
}

export async function fetchVariables(
  reference: number
): Promise<DebugVariable[]> {
  if (!dap) return [];
  try {
    const result = await dap.request("variables", {
      variablesReference: reference,
    });
    return mapVariables(result.variables);
  } catch {
    return [];
  }
}

export async function evaluateWatch(
  index: number,
  expression: string
): Promise<void> {
  const store = useStore.getState();
  if (!dap) {
    store.setWatchResult(index, "Oturum yok", true);
    return;
  }
  const frameId =
    store.debugSelectedFrame ?? store.debugFrames[0]?.id ?? undefined;
  try {
    const result = await dap.request("evaluate", {
      expression,
      frameId,
      context: "watch",
    });
    useStore.getState().setWatchResult(index, result.result ?? "", false);
  } catch (error) {
    useStore
      .getState()
      .setWatchResult(index, (error as Error).message, true);
  }
}

export async function evaluateConsole(expression: string): Promise<void> {
  if (!dap) return;
  const store = useStore.getState();
  const frameId =
    store.debugSelectedFrame ?? store.debugFrames[0]?.id ?? undefined;
  try {
    const result = await dap.request("evaluate", {
      expression,
      frameId,
      context: "repl",
    });
    store.appendDebugOutput(`> ${expression}\n${result.result ?? ""}\n`);
  } catch (error) {
    store.appendDebugOutput(`> ${expression}\n${(error as Error).message}\n`);
  }
}

export function isDebugging(): boolean {
  return dap !== null;
}
