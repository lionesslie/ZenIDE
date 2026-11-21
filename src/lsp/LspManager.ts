import * as monaco from "monaco-editor";
import { LspClient } from "./LspClient";
import { serverForLanguage } from "./servers";
import * as api from "../api";
import { onEvent } from "../api";
import { useStore } from "../store";
import {
  baseName,
  offsetAt,
  pathKey,
  pathToUri,
  uriToPath,
} from "../utils/path";
import { detectLanguage } from "../utils/language";
import { ensureModel, getModel, getModelPath } from "../editor/models";
import type { OutlineSymbol, Problem } from "../types";
import type { UnlistenFn } from "@tauri-apps/api/event";

interface DiagnosticsPayload {
  uri: string;
  diagnostics: any[];
}

function severityToMonaco(severity: number | undefined): monaco.MarkerSeverity {
  switch (severity) {
    case 1:
      return monaco.MarkerSeverity.Error;
    case 2:
      return monaco.MarkerSeverity.Warning;
    case 3:
      return monaco.MarkerSeverity.Info;
    default:
      return monaco.MarkerSeverity.Hint;
  }
}

function rangeToMonaco(range: any): monaco.IRange {
  return {
    startLineNumber: (range?.start?.line ?? 0) + 1,
    startColumn: (range?.start?.character ?? 0) + 1,
    endLineNumber: (range?.end?.line ?? 0) + 1,
    endColumn: (range?.end?.character ?? 0) + 1,
  };
}

function convertSymbols(items: any[]): OutlineSymbol[] {
  return items.map((item) => {
    const range =
      item.selectionRange ?? item.range ?? item.location?.range ?? {
        start: { line: 0, character: 0 },
      };
    return {
      name: item.name ?? "?",
      detail: item.detail,
      kind: item.kind ?? 0,
      line: (range.start?.line ?? 0) + 1,
      column: (range.start?.character ?? 0) + 1,
      children: Array.isArray(item.children)
        ? convertSymbols(item.children)
        : undefined,
    };
  });
}

class LspManager {
  private clients = new Map<string, LspClient>();
  private pendingClients = new Map<string, Promise<LspClient | null>>();
  private fileClients = new Map<string, LspClient>();
  private bySession = new Map<number, LspClient>();
  private opened = new Set<string>();
  private versions = new Map<string, number>();
  private changeTimers = new Map<string, number>();
  private failed = new Set<string>();
  private stopping = false;
  private epoch = 0;
  private initPromise: Promise<void> | null = null;
  private unlisteners: UnlistenFn[] = [];

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        this.unlisteners.push(
          await onEvent<{ session: number; message: string }>(
            "lsp-message",
            (payload) => {
              this.bySession.get(payload.session)?.handleMessage(payload.message);
            }
          ),
          await onEvent<{ session: number }>("lsp-exit", (payload) =>
            this.handleExit(payload.session)
          ),
          await onEvent<{ session: number; data: string }>(
            "lsp-stderr",
            (payload) => {
              console.debug(`[lsp:${payload.session}] ${payload.data}`);
            }
          )
        );
      })();
    }
    return this.initPromise;
  }

  private clientKey(language: string): string | null {
    const workspace = useStore.getState().workspace;
    if (!workspace) return null;
    return `${language}|${pathKey(workspace)}`;
  }

  private ensureClient(language: string): Promise<LspClient | null> {
    const key = this.clientKey(language);
    if (!key) return Promise.resolve(null);
    const existing = this.clients.get(key);
    if (existing) return Promise.resolve(existing);
    const pending = this.pendingClients.get(key);
    if (pending) return pending;
    const promise = this.createClient(language, key).finally(() => {
      this.pendingClients.delete(key);
    });
    this.pendingClients.set(key, promise);
    return promise;
  }

  private async createClient(
    language: string,
    key: string
  ): Promise<LspClient | null> {
    if (this.failed.has(key)) return null;
    if (this.stopping) return null;
    try {
      await this.init();
    } catch {
      return null;
    }
    const epoch = this.epoch;
    const state = useStore.getState();
    const workspace = state.workspace;
    if (!workspace || this.stopping) return null;
    const server = serverForLanguage(language, state.config, workspace);
    if (!server) return null;

    const client = new LspClient(language, workspace);
    state.setLspStatus(language, "starting");

    try {
      await client.start(server.command, server.args);
    } catch (error) {
      if (!this.stopping) {
        this.failed.add(key);
        state.setLspStatus(language, "error");
        state.toast(`Dil sunucusu başlatılamadı (${language}): ${error}`, "error");
      }
      return null;
    }

    this.bySession.set(client.session, client);
    if (this.stopping || epoch !== this.epoch) {
      await client.stop();
      this.bySession.delete(client.session);
      return null;
    }
    client.onNotification((method, params) =>
      this.handleNotification(language, client, method, params)
    );
    client.onRequest((method, params) =>
      this.handleServerRequest(method, params)
    );
    client.onExit(() => this.handleExit(client.session));

    const root = workspace;
    try {
      await client.request(
        "initialize",
        {
          processId: null,
          clientInfo: { name: "ZenIDE", version: "0.1.0" },
          rootUri: pathToUri(root),
          rootPath: root,
          workspaceFolders: [
            { uri: pathToUri(root), name: baseName(root) },
          ],
          capabilities: {
            workspace: {
              applyEdit: true,
              workspaceEdit: { documentChanges: true },
              configuration: true,
              workspaceFolders: true,
              didChangeConfiguration: { dynamicRegistration: false },
            },
            textDocument: {
              synchronization: {
                dynamicRegistration: false,
                willSave: false,
                didSave: true,
              },
              completion: {
                dynamicRegistration: false,
                contextSupport: true,
                completionItem: {
                  snippetSupport: true,
                  documentationFormat: ["markdown", "plaintext"],
                  insertReplaceSupport: true,
                  resolveSupport: {
                    properties: ["documentation", "detail", "additionalTextEdits"],
                  },
                },
              },
              hover: {
                dynamicRegistration: false,
                contentFormat: ["markdown", "plaintext"],
              },
              definition: { dynamicRegistration: false, linkSupport: true },
              references: { dynamicRegistration: false },
              documentSymbol: {
                dynamicRegistration: false,
                hierarchicalDocumentSymbolSupport: true,
              },
              rename: { dynamicRegistration: false, prepareSupport: true },
              formatting: { dynamicRegistration: false },
              publishDiagnostics: {
                relatedInformation: true,
                versionSupport: true,
              },
              codeAction: {
                dynamicRegistration: false,
                codeActionLiteralSupport: {
                  codeActionKind: { valueSet: ["quickfix", "refactor"] },
                },
              },
            },
            window: { workDoneProgress: true },
          },
          initializationOptions: {},
        },
        90_000
      );
      if (this.stopping || epoch !== this.epoch) {
        await client.stop();
        this.bySession.delete(client.session);
        return null;
      }
      client.ready = true;
      client.notify("initialized", {});
      this.clients.set(key, client);
      state.setLspStatus(language, "ready");
      return client;
    } catch (error) {
      if (epoch === this.epoch && !this.stopping) {
        state.setLspStatus(language, "error");
        state.toast(`LSP başlatılamadı (${language}): ${error}`, "error");
      }
      await client.stop();
      this.bySession.delete(client.session);
      return null;
    }
  }

  private handleServerRequest(method: string, params: any): any {
    if (method === "workspace/configuration") {
      const items = params?.items ?? [];
      return items.map(() => ({}));
    }
    if (method === "workspace/workspaceFolders") {
      const workspace = useStore.getState().workspace;
      return workspace
        ? [{ uri: pathToUri(workspace), name: baseName(workspace) }]
        : null;
    }
    if (method === "client/registerCapability") return null;
    if (method === "client/unregisterCapability") return null;
    if (method === "window/workDoneProgress/create") return null;
    if (method === "workspace/applyEdit") {
      return { applied: false, failureReason: "ZenIDE sunucu düzenlemelerini uygulamaz." };
    }
    if (method === "window/showMessageRequest") return null;
    return null;
  }

  private handleNotification(
    language: string,
    client: LspClient,
    method: string,
    params: any
  ): void {
    if (method === "textDocument/publishDiagnostics") {
      this.handleDiagnostics(params);
      return;
    }
    if (method === "window/showMessage") {
      if (params?.type === 1) {
        useStore.getState().toast(String(params.message ?? ""), "error");
      }
      return;
    }
    if (method === "window/logMessage") {
      console.debug(`[${language}] ${params?.message ?? ""}`);
      return;
    }
    if (method === "$/progress") {
      return;
    }
    void client;
  }

  private handleDiagnostics(params: DiagnosticsPayload): void {
    if (!params?.uri) return;
    const path = uriToPath(params.uri);
    const diagnostics = Array.isArray(params.diagnostics)
      ? params.diagnostics
      : [];
    const problems: Problem[] = diagnostics.map((diagnostic) => ({
      path,
      line: (diagnostic.range?.start?.line ?? 0) + 1,
      column: (diagnostic.range?.start?.character ?? 0) + 1,
      endLine: (diagnostic.range?.end?.line ?? 0) + 1,
      endColumn: (diagnostic.range?.end?.character ?? 0) + 1,
      message: diagnostic.message ?? "",
      severity: diagnostic.severity ?? 3,
      source: diagnostic.source,
    }));
    useStore.getState().setProblemsForFile(path, problems);
    const model = getModel(path);
    if (model) {
      monaco.editor.setModelMarkers(
        model,
        "lsp",
        diagnostics.map((diagnostic) => ({
          severity: severityToMonaco(diagnostic.severity),
          message: diagnostic.message ?? "",
          startLineNumber: (diagnostic.range?.start?.line ?? 0) + 1,
          startColumn: (diagnostic.range?.start?.character ?? 0) + 1,
          endLineNumber: (diagnostic.range?.end?.line ?? 0) + 1,
          endColumn: (diagnostic.range?.end?.character ?? 0) + 1,
          source: diagnostic.source ?? "lsp",
        }))
      );
    }
  }

  private handleExit(session: number): void {
    const client = this.bySession.get(session);
    if (!client) return;
    const wasReady = client.ready;
    this.bySession.delete(session);
    client.failPending();
    if (this.stopping) return;
    for (const [key, value] of [...this.clients]) {
      if (value === client) this.clients.delete(key);
    }
    for (const [key, value] of [...this.fileClients]) {
      if (value === client) this.fileClients.delete(key);
    }
    if (!wasReady) return;
    useStore.getState().setLspStatus(client.languageId, "error");
    useStore
      .getState()
      .toast(`Dil sunucusu kapandı: ${client.languageId}`, "error");
  }

  async openFile(path: string, language: string): Promise<void> {
    const client = await this.ensureClient(language);
    if (!client) return;
    const key = pathKey(path);
    this.fileClients.set(key, client);
    const model = getModel(path);
    if (!model || this.opened.has(key)) return;
    this.opened.add(key);
    this.versions.set(key, 1);
    client.notify("textDocument/didOpen", {
      textDocument: {
        uri: pathToUri(path),
        languageId: language,
        version: 1,
        text: model.getValue(),
      },
    });
  }

  didChange(path: string): void {
    const key = pathKey(path);
    const existing = this.changeTimers.get(key);
    if (existing) window.clearTimeout(existing);
    this.changeTimers.set(
      key,
      window.setTimeout(() => {
        this.changeTimers.delete(key);
        this.flushChange(path);
      }, 300)
    );
  }

  private flushChange(path: string): void {
    const key = pathKey(path);
    const client = this.fileClients.get(key);
    const model = getModel(path);
    if (!client || !client.ready || !model) return;
    if (!this.opened.has(key)) {
      void this.openFile(path, detectLanguage(path));
      return;
    }
    const version = (this.versions.get(key) ?? 1) + 1;
    this.versions.set(key, version);
    client.notify("textDocument/didChange", {
      textDocument: { uri: pathToUri(path), version },
      contentChanges: [{ text: model.getValue() }],
    });
  }

  didSave(path: string): void {
    const key = pathKey(path);
    const timer = this.changeTimers.get(key);
    if (timer) {
      window.clearTimeout(timer);
      this.changeTimers.delete(key);
      this.flushChange(path);
    }
    const client = this.fileClients.get(key);
    if (!client || !client.ready) return;
    client.notify("textDocument/didSave", {
      textDocument: { uri: pathToUri(path) },
    });
  }

  didClose(path: string): void {
    const key = pathKey(path);
    const timer = this.changeTimers.get(key);
    if (timer) {
      window.clearTimeout(timer);
      this.changeTimers.delete(key);
    }
    const client = this.fileClients.get(key);
    if (client && this.opened.has(key)) {
      client.notify("textDocument/didClose", {
        textDocument: { uri: pathToUri(path) },
      });
    }
    this.opened.delete(key);
    this.fileClients.delete(key);
    this.versions.delete(key);
    useStore.getState().clearProblemsForFile(path);
  }

  async request(path: string, method: string, params: any): Promise<any> {
    const client = this.fileClients.get(pathKey(path));
    if (!client || !client.ready) return null;
    try {
      return await client.request(method, params);
    } catch (error) {
      console.debug(`LSP isteği başarısız (${method})`, error);
      return null;
    }
  }

  async documentSymbols(path: string): Promise<OutlineSymbol[]> {
    const result = await this.request(path, "textDocument/documentSymbol", {
      textDocument: { uri: pathToUri(path) },
    });
    if (!Array.isArray(result)) return [];
    return convertSymbols(result);
  }

  async applyWorkspaceEdit(edit: any): Promise<void> {
    if (!edit) return;
    const changes = new Map<string, any[]>();
    const addChanges = (uri: string, edits: any[]) => {
      if (!uri || !Array.isArray(edits)) return;
      const current = changes.get(uri) ?? [];
      changes.set(uri, [...current, ...edits]);
    };
    if (edit.changes) {
      for (const [uri, edits] of Object.entries(edit.changes)) {
        addChanges(uri, edits as any[]);
      }
    }
    if (Array.isArray(edit.documentChanges)) {
      for (const change of edit.documentChanges) {
        if (change?.textDocument?.uri && Array.isArray(change.edits)) {
          addChanges(change.textDocument.uri, change.edits);
        }
      }
    }

    for (const [uri, edits] of changes) {
      const path = uriToPath(uri);
      let model = getModel(path);
      let content = model?.getValue();
      if (!model) {
        try {
          content = await api.readFile(path);
        } catch {
          continue;
        }
        ensureModel(path, content, detectLanguage(path));
        model = getModel(path);
      }
      if (!model) continue;
      let text = content ?? "";
      const sorted = [...edits].sort(
        (a, b) =>
          b.range.start.line - a.range.start.line ||
          b.range.start.character - a.range.start.character
      );
      for (const editItem of sorted) {
        const start = offsetAt(
          text,
          editItem.range.start.line,
          editItem.range.start.character
        );
        const end = offsetAt(
          text,
          editItem.range.end.line,
          editItem.range.end.character
        );
        text = text.slice(0, start) + editItem.newText + text.slice(end);
      }
      model.setValue(text);
      const isOpen = useStore
        .getState()
        .openFiles.some((file) => pathKey(file.path) === pathKey(path));
      if (isOpen) {
        await useStore.getState().saveFile(path);
      } else {
        try {
          await api.writeFile(path, text);
        } catch (error) {
          useStore.getState().toast(String(error), "error");
        }
      }
    }
    void useStore.getState().refreshGit();
  }

  async shutdownAll(): Promise<void> {
    this.epoch += 1;
    this.stopping = true;
    try {
      for (const timer of this.changeTimers.values()) {
        window.clearTimeout(timer);
      }
      this.changeTimers.clear();
      for (const client of new Set([
        ...this.clients.values(),
        ...this.bySession.values(),
      ])) {
        await client.stop();
      }
      this.clients.clear();
      this.pendingClients.clear();
      this.fileClients.clear();
      this.bySession.clear();
      this.opened.clear();
      this.versions.clear();
      this.failed.clear();
      for (const language of ["rust", "cpp", "python"]) {
        useStore.getState().setLspStatus(language, "off");
      }
    } finally {
      this.stopping = false;
    }
  }

  async reopenAll(): Promise<void> {
    for (const file of useStore.getState().openFiles) {
      await this.openFile(file.path, file.language);
    }
  }

  async requestForModel(
    model: monaco.editor.ITextModel,
    method: string,
    params: any
  ): Promise<any> {
    const path = getModelPath(model);
    if (!path) return null;
    return this.request(path, method, params);
  }
}

export const lspManager = new LspManager();
export { rangeToMonaco, convertSymbols };
