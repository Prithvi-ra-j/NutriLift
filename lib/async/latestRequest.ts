export interface RequestCounter {
  current: number;
}

export function beginRequest(counter: RequestCounter): number {
  counter.current += 1;
  return counter.current;
}

export function isLatestRequest(counter: RequestCounter, requestId: number): boolean {
  return counter.current === requestId;
}

export function invalidateRequests(counter: RequestCounter): void {
  counter.current += 1;
}
