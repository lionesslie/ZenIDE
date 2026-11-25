import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import * as api from "../api";
import { useStore } from "../store";
import { baseName } from "../utils/path";
import { CloseIcon, PlusIcon, TerminalIcon } from "./Icons";

interface SessionMeta {
  id: number;
  title: string;
  cwd: string;
  dead: boolean;
}

interface TerminalSession {
  term: Terminal;
  fit: FitAddon;
  host: HTMLDivElement;
}

const terminalMap = new Map<number, TerminalSession>();
const outputHandlers = new Map<number, (data: Uint8Array) => void>();
const pendingOutput = new Map<number, Uint8Array[]>();
const exitHandlers = new Map<number, () => void>();
let listenersReady = false;
let listenersPromise: Promise<void> | null = null;
let nextId = 1;
let currentActiveId: number | null = null;

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function ensureListeners(): Promise<void> {
  if (listenersReady) return Promise.resolve();
  if (listenersPromise) return listenersPromise;
  listenersPromise = (async () => {
    await api.onEvent<{ id: number; data: string }>("pty-output", (payload) => {
      const bytes = decodeBase64(payload.data);
      const handler = outputHandlers.get(payload.id);
      if (handler) {
        handler(bytes);
        return;
      }
      const pending = pendingOutput.get(payload.id) ?? [];
      if (pending.length < 400) {
        pending.push(bytes);
        pendingOutput.set(payload.id, pending);
      }
    });
    await api.onEvent<{ id: number }>("pty-exit", (payload) => {
      const session = terminalMap.get(payload.id);
      session?.term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
      exitHandlers.get(payload.id)?.();
    });
    listenersReady = true;
  })();
  return listenersPromise;
}

function registerOutput(id: number, handler: (data: Uint8Array) => void): void {
  outputHandlers.set(id, handler);
  const pending = pendingOutput.get(id);
  if (pending) {
    pendingOutput.delete(id);
    for (const chunk of pending) handler(chunk);
  }
}

export function TerminalPanel() {
  const bottomVisible = useStore((state) => state.bottomVisible);
  const bottomTab = useStore((state) => state.bottomTab);
  const terminalConfig = useStore((state) => state.config.terminal);
  const theme = useStore((state) => state.config.theme);
  const currentFolder = useStore((state) => state.currentFolder);
  const animationsEnabled = useStore(
    (state) => state.config.ui.animations_enabled
  );
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const hostsRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(null);
  const counterRef = useRef(1);
  const startedRef = useRef(false);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const activate = (id: number) => {
    setActiveId(id);
    currentActiveId = id;
    for (const [sessionId, session] of terminalMap) {
      session.host.style.display = sessionId === id ? "block" : "none";
    }
    window.requestAnimationFrame(() => {
      const session = terminalMap.get(id);
      if (!session || session.host.clientWidth === 0) return;
      try {
        session.fit.fit();
      } catch {
        // ignore fit errors while hidden
      }
      session.term.focus();
    });
  };

  const spawnTerminal = async () => {
    if (!hostsRef.current) return;
    await ensureListeners();
    const id = nextId++;
    const title = `Terminal ${counterRef.current++}`;
    const state = useStore.getState();
    const cwd = state.currentFolder ?? state.workspace ?? state.home ?? "";
    const term = new Terminal({
      fontFamily: `"${terminalConfig.font_family.replace(/"/g, "")}", "Cascadia Code", Consolas, monospace`,
      fontSize: terminalConfig.font_size,
      scrollback: terminalConfig.scrollback,
      cursorBlink: animationsEnabled,
      allowProposedApi: true,
      theme: {
        background: theme.editor_background,
        foreground: theme.text,
        cursor: "#ffffff",
        selectionBackground: "#ffffff40",
        black: "#0a0a0a",
        brightBlack: "#5f5f5f",
        red: "#d0d0d0",
        brightRed: "#e6e6e6",
        green: "#b0b0b0",
        brightGreen: "#c8c8c8",
        yellow: "#a0a0a0",
        brightYellow: "#bdbdbd",
        blue: "#c0c0c0",
        brightBlue: "#d9d9d9",
        magenta: "#9a9a9a",
        brightMagenta: "#b5b5b5",
        cyan: "#ababab",
        brightCyan: "#cccccc",
        white: "#f1f1f1",
        brightWhite: "#ffffff",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    const host = document.createElement("div");
    host.className = "terminal-host";
    host.style.display = "none";
    hostsRef.current.appendChild(host);
    term.open(host);

    const session: TerminalSession = { term, fit, host };
    terminalMap.set(id, session);
    setSessions((previous) => [
      ...previous,
      { id, title, cwd, dead: false },
    ]);
    registerOutput(id, (data) => term.write(data));
    exitHandlers.set(id, () => {
      setSessions((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, dead: true } : item
        )
      );
    });

    term.onData((data) => {
      void api.ptyWrite(id, data).catch((error) => {
        term.write(`\r\n\x1b[31m${String(error)}\x1b[0m\r\n`);
      });
    });
    term.onResize(({ cols, rows }) => {
      void api.ptyResize(id, cols, rows).catch(() => undefined);
    });

    term.write("\x1b[90mStarting ZenIDE terminal…\x1b[0m\r\n");
    const cols = Math.max(term.cols, 80);
    const rows = Math.max(term.rows, 24);
    try {
      await api.ptySpawn(id, cwd, terminalConfig.shell, cols, rows);
    } catch (error) {
      term.write(`\r\n\x1b[31mFailed to start terminal: ${String(error)}\x1b[0m\r\n`);
    }
    activate(id);
  };

  const closeTerminal = async (id: number) => {
    await api.ptyKill(id).catch(() => undefined);
    const session = terminalMap.get(id);
    session?.term.dispose();
    session?.host.remove();
    terminalMap.delete(id);
    outputHandlers.delete(id);
    pendingOutput.delete(id);
    exitHandlers.delete(id);
    setSessions((previous) => {
      const remaining = previous.filter((item) => item.id !== id);
      if (activeIdRef.current === id) {
        const next = remaining[remaining.length - 1]?.id ?? null;
        if (next !== null) {
          window.setTimeout(() => activate(next), 0);
        } else {
          setActiveId(null);
          currentActiveId = null;
        }
      }
      return remaining;
    });
  };

  useEffect(() => {
    if (!api.isTauri) return;
    if (!startedRef.current) {
      startedRef.current = true;
      void spawnTerminal();
    }
    return () => {
      for (const [id, session] of terminalMap) {
        void api.ptyKill(id).catch(() => undefined);
        session.term.dispose();
        session.host.remove();
      }
      terminalMap.clear();
      outputHandlers.clear();
      pendingOutput.clear();
      exitHandlers.clear();
      startedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!bottomVisible || bottomTab !== "terminal") return;
    const id = activeId ?? sessions[0]?.id ?? null;
    if (id !== null) {
      window.requestAnimationFrame(() => activate(id));
    }
  }, [bottomVisible, bottomTab, activeId, sessions.length]);

  useEffect(() => {
    const wrapper = hostsRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => {
      const state = useStore.getState();
      if (!state.bottomVisible || state.bottomTab !== "terminal") return;
      const id = activeIdRef.current;
      const session = id !== null ? terminalMap.get(id) : null;
      if (session && session.host.clientWidth > 0) {
        try {
          session.fit.fit();
        } catch {
          // ignore
        }
      }
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    for (const session of terminalMap.values()) {
      session.term.options.cursorBlink = animationsEnabled;
    }
  }, [animationsEnabled]);

  useEffect(() => {
    if (!currentFolder || terminalMap.size === 0) return;
    const id = currentActiveId ?? [...terminalMap.keys()].pop() ?? null;
    if (id === null) return;
    const escaped = currentFolder.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    void api.ptyWrite(id, `cd "${escaped}"\r`).catch(() => undefined);
  }, [currentFolder]);

  useEffect(() => {
    for (const session of terminalMap.values()) {
      session.term.options.fontSize = terminalConfig.font_size;
      session.term.options.fontFamily = `"${terminalConfig.font_family.replace(/"/g, "")}", "Cascadia Code", Consolas, monospace`;
      session.term.options.scrollback = terminalConfig.scrollback;
    }
  }, [terminalConfig]);

  if (!api.isTauri) {
    return (
      <div className="empty-panel">
        <p>Terminal is only available in the desktop app.</p>
      </div>
    );
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-tabs">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`terminal-tab ${
              activeId === session.id ? "active" : ""
            } ${session.dead ? "dead" : ""}`}
            title={`${session.cwd} · ${session.title}`}
            onClick={() => activate(session.id)}
          >
            <TerminalIcon size={12} />
            <span>{baseName(session.cwd) || session.title}</span>
            <button
              className="terminal-tab-close"
              title="Terminali kapat"
              onClick={(event) => {
                event.stopPropagation();
                void closeTerminal(session.id);
              }}
            >
              <CloseIcon size={11} />
            </button>
          </div>
        ))}
        <button
          className="icon-button small"
          title="Yeni terminal"
          onClick={() => void spawnTerminal()}
        >
          <PlusIcon size={12} />
        </button>
      </div>
      <div className="terminal-hosts" ref={hostsRef} />
    </div>
  );
}
