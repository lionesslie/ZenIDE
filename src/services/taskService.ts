import * as api from "../api";
import { onEvent } from "../api";
import { useStore } from "../store";

let initPromise: Promise<void> | null = null;
const resolvers = new Map<number, (code: number | null) => void>();

export function initTaskService(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await onEvent<{ id: number; stream: string; data: string }>(
        "task-output",
        (payload) => {
          useStore
            .getState()
            .appendTaskOutput(payload.id, payload.data, payload.stream);
        }
      );
      await onEvent<{ id: number; code: number | null }>(
        "task-exit",
        (payload) => {
          useStore.getState().finishTask(payload.id, payload.code);
          const resolver = resolvers.get(payload.id);
          if (resolver) {
            resolvers.delete(payload.id);
            resolver(payload.code);
          }
        }
      );
    })();
  }
  return initPromise;
}

export async function runTask(
  name: string,
  program: string,
  args: string[],
  cwd: string
): Promise<number | null> {
  await initTaskService();
  const store = useStore.getState();
  const id = store.startTask(name);
  store.setBottomVisible(true);
  store.setBottomTab("output");
  const finished = new Promise<number | null>((resolve) => {
    resolvers.set(id, resolve);
  });
  try {
    await api.runProcess(id, program, args, cwd);
  } catch (error) {
    store.appendTaskOutput(id, `${error}\n`, "stderr");
    store.finishTask(id, -1);
    resolvers.delete(id);
    return -1;
  }
  return finished;
}

export async function killTask(id: number): Promise<void> {
  try {
    await api.killProcess(id);
  } catch (error) {
    useStore.getState().toast(String(error), "error");
  }
}
