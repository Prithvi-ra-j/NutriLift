import { sqlite } from "./client";
import { logger } from "../../logger";

let chain: Promise<unknown> = Promise.resolve();
const commitListeners = new Set<() => void>();

export function onCommit(listener: () => void): () => void {
  commitListeners.add(listener);
  return () => commitListeners.delete(listener);
}

export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

export function inTx<T>(fn: () => Promise<T>, notifyCommit = true): Promise<T> {
  return runExclusive(async () => {
    let result!: T;
    await sqlite.withTransactionAsync(async () => {
      result = await fn();
    });
    if (notifyCommit) {
      for (const listener of [...commitListeners]) {
        try {
          listener();
        } catch (error) {
          logger.error("Database commit listener failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    return result;
  });
}
