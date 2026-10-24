import { beginRequest, isLatestRequest } from "../latestRequest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("latest request sequencing", () => {
  it("does not let an earlier slow load overwrite the later selected date", async () => {
    const requestCounter = { current: 0 };
    const earlier = deferred<string>();
    const later = deferred<string>();
    let displayed = "";

    const load = async (response: Promise<string>) => {
      const requestId = beginRequest(requestCounter);
      const value = await response;
      if (isLatestRequest(requestCounter, requestId)) displayed = value;
    };

    const earlierLoad = load(earlier.promise);
    const laterLoad = load(later.promise);

    later.resolve("Tuesday");
    await laterLoad;
    earlier.resolve("Monday");
    await earlierLoad;

    expect(displayed).toBe("Tuesday");
  });
});
