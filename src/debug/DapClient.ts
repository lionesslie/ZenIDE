import * as api from "../api";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

type EventHandler = (event: string, body: any) => void;

export class DapClient {
  session = 0;
  private seq = 1;
  private pending = new Map<number, PendingRequest>();
  private handlers = new Set<EventHandler>();

  async start(program: string, args: string[], cwd: string): Promise<void> {
    this.session = await api.dapStart(program, args, cwd);
  }

  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  handleMessage(raw: string): void {
    let message: any;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === "response") {
      const pending = this.pending.get(message.request_seq);
      if (!pending) return;
      this.pending.delete(message.request_seq);
      if (message.success) {
        pending.resolve(message.body ?? {});
      } else {
        pending.reject(new Error(message.message ?? "DAP isteği başarısız."));
      }
      return;
    }
    if (message.type === "event") {
      for (const handler of [...this.handlers]) {
        handler(message.event, message.body ?? {});
      }
    }
  }

  request(command: string, args: any = {}, timeout = 20_000): Promise<any> {
    const seq = this.seq++;
    return new Promise((resolve, reject) => {
      this.pending.set(seq, { resolve, reject });
      this.send({ seq, type: "request", command, arguments: args });
      window.setTimeout(() => {
        if (this.pending.delete(seq)) {
          reject(new Error(`DAP zaman aşımı: ${command}`));
        }
      }, timeout);
    });
  }

  waitForEvent(name: string, timeout = 5000): Promise<any> {
    return new Promise((resolve) => {
      const handler = (event: string, body: any) => {
        if (event !== name) return;
        cleanup();
        resolve(body);
      };
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeout);
      const cleanup = () => {
        window.clearTimeout(timer);
        this.handlers.delete(handler);
      };
      this.handlers.add(handler);
    });
  }

  private send(payload: Record<string, any>): void {
    void api.dapSend(this.session, JSON.stringify(payload)).catch((error) => {
      console.error("DAP send error", error);
    });
  }

  failPending(message = "Hata ayıklama bağlantısı kapandı."): void {
    for (const pending of this.pending.values()) {
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  async stop(): Promise<void> {
    try {
      await api.dapStop(this.session);
    } catch {
      // adapter already exited
    }
    this.failPending();
    this.handlers.clear();
  }
}
