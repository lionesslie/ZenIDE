type Handler = (payload: any) => void;

const handlers = new Map<string, Set<Handler>>();

export function on(event: string, handler: Handler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

export function emit(event: string, payload?: any): void {
  const set = handlers.get(event);
  if (!set) return;
  for (const handler of [...set]) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`bus handler error (${event})`, error);
    }
  }
}
