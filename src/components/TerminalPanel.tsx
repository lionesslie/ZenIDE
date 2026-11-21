import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import * as api from "../api";
import { useStore } from "../store";
import { CloseIcon, PlusIcon, TerminalIcon } from "./Icons";

interface SessionMeta {
  id: number;
  title: string;
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
      session?.term.write("\r\n\x1b[90m[İşlem sonlandı]\x1b[0m\r\n");
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
    const term = new Terminal({
      fontFamily: `"${terminalConfig.font_family.replace(/"/g, "")}", "Cascadia Code", Consolas, monospace`,
      fontSize: terminalConfig.font_size,
      scrollback: terminalConfig.scrollback,
      cursorBlink: true,
      allowProposedApi: true,
      theme: {
        background: theme.background,
        foreground: theme.text,
        cursor: "#d4d4d4",
        selectionBackground: "#2b4b7a",
        black: "#1e1f22",
        brightBlack: "#5c6370",
        red: "#e5484d",
        brightRed: "#ff6b6f",
        green: "#6aab73",
        brightGreen: "#8fd39a",
        yellow: "#d6a44a",
        brightYellow: "#f0c674",
        blue: "#4a88ff",
        brightBlue: "#74a7ff",
        magenta: "#c678dd",
        brightMagenta: "#e29cf0",
        cyan: "#2aacb8",
        brightCyan: "#5fd4de",
        white: "#bcbec4",
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
      { id, title, dead: false },
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

    term.write("\x1b[90mZenIDE terminali başlatılıyor…\x1b[0m\r\n");
    const cols = Math.max(term.cols, 80);
    const rows = Math.max(term.rows, 24);
    try {
      await api.ptySpawn(
        id,
        useStore.getState().workspace ?? useStore.getState().home ?? "",
        terminalConfig.shell,
        cols,
        rows
      );
    } catch (error) {
      term.write(`\r\n\x1b[31mTerminal başlatılamadı: ${String(error)}\x1b[0m\r\n`);
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
      session.term.options.fontSize = terminalConfig.font_size;
      session.term.options.fontFamily = `"${terminalConfig.font_family.replace(/"/g, "")}", "Cascadia Code", Consolas, monospace`;
      session.term.options.scrollback = terminalConfig.scrollback;
    }
  }, [terminalConfig]);

  if (!api.isTauri) {
    return (
      <div className="empty-panel">
        <p>Terminal yalnızca masaüstü uygulamasında kullanılabilir.</p>
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
            onClick={() => activate(session.id)}
          >
            <TerminalIcon size={12} />
            <span>{session.title}</span>
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
