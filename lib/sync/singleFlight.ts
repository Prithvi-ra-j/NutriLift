export function createSingleFlight<T>(operation: (reason: string) => Promise<T>) {
  let current: Promise<T> | null = null;
  const run = (reason: string): Promise<T> => {
    if (current) return current;
    current = operation(reason).finally(() => {
      current = null;
    });
    return current;
  };
  return Object.assign(run, {
    get isRunning() {
      return current !== null;
    },
  });
}
