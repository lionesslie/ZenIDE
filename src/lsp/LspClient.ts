import * as api from "../api";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

type NotificationHandler = (method: string, params: any) => void;
type RequestHandler = (method: string, params: any) => any;
type ExitHandler = () => void;

export class LspClient {
  session = 0;
  ready = false;
  languageId: string;
  root: string;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private notificationHandlers = new Set<NotificationHandler>();
  private requestHandlers = new Set<RequestHandler>();
  private exitHandlers = new Set<ExitHandler>();

  constructor(languageId: string, root: string) {
    this.languageId = languageId;
    this.root = root;
  }

  async start(command: string, args: string[]): Promise<void> {
    this.session = await api.lspStart(command, args, this.root);
  }

  onNotification(handler: NotificationHandler): void {
    this.notificationHandlers.add(handler);
  }

  onRequest(handler: RequestHandler): void {
    this.requestHandlers.add(handler);
  }

  onExit(handler: ExitHandler): void {
    this.exitHandlers.add(handler);
  }

  handleMessage(raw: string): void {
    let message: any;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (
      message.id !== undefined &&
      (message.result !== undefined || message.error !== undefined)
    ) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(message.error);
      } else {
        pending.resolve(message.result);
      }
      return;
    }
    if (message.id !== undefined && message.method) {
      let result: any = null;
      for (const handler of this.requestHandlers) {
        const handled = handler(message.method, message.params);
        if (handled !== undefined) {
          result = handled;
          break;
        }
      }
      this.send({ jsonrpc: "2.0", id: message.id, result });
      return;
    }
    if (message.method) {
      for (const handler of this.notificationHandlers) {
        handler(message.method, message.params);
      }
    }
  }

  notifyExit(): void {
    this.ready = false;
    for (const handler of this.exitHandlers) handler();
  }

  failPending(message = "Dil sunucusu bağlantısı kapandı."): void {
    this.ready = false;
    for (const pending of this.pending.values()) {
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  send(payload: Record<string, any>): void {
    void api.lspSend(this.session, JSON.stringify(payload)).catch((error) => {
      console.error("LSP send error", error);
    });
  }

  request(method: string, params: any, timeout = 30_000): Promise<any> {
    if (!this.session) {
      return Promise.reject(new Error("Dil sunucusu başlatılmadı."));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ jsonrpc: "2.0", id, method, params });
      window.setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`LSP zaman aşımı: ${method}`));
        }
      }, timeout);
    });
  }

  notify(method: string, params: any): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  async stop(): Promise<void> {
    try {
      await api.lspStop(this.session);
    } catch {
      // process may already be gone
    }
    this.failPending();
    this.ready = false;
  }
}
