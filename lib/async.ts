import { logger } from "./logger";

export function fireAndLog(promise: Promise<unknown>, context: string): void {
  void promise.catch((error: unknown) => {
    logger.error(context, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
