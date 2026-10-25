const mockGetAiPreference = jest.fn();
const mockInvoke = jest.fn();

jest.mock("../../data/aiPreferences", () => ({
  getAiPreference: (...args: unknown[]) => mockGetAiPreference(...args),
}));
jest.mock("../../supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { AiError, chat, mapHttp, mapTransportError } from "../gateway";

describe("AI gateway error mapping", () => {
  beforeEach(() => {
    mockGetAiPreference.mockReset();
    mockInvoke.mockReset();
    mockGetAiPreference.mockResolvedValue("accepted");
  });

  it("maps unauthorized responses", () => {
    const error = mapHttp(401, {});
    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe("unauthorized");
  });

  it("preserves the rate-limit message and retry-after value", () => {
    const error = mapHttp(429, { error: "Please retry.", retry_after: 19 });
    expect(error.code).toBe("rate_limited");
    expect(error.message).toBe("Please retry.");
    expect(error.retryAfterSec).toBe(19);
  });

  it("maps provider failures to a retryable server error", () => {
    expect(mapHttp(500, {}).code).toBe("server");
  });

  it("maps network and relay errors to offline", () => {
    expect(mapTransportError("FunctionsFetchError").code).toBe("offline");
    expect(mapTransportError("FunctionsRelayError").code).toBe("offline");
  });

  it("maps function HTTP errors using the response status and retry metadata", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        name: "FunctionsHttpError",
        context: new Response(
          JSON.stringify({ error: "Daily AI limit reached.", retry_after: 19 }),
          { status: 429 },
        ),
      },
    });

    await expect(chat({
      messages: [{ role: "user", content: "How did I do this week?" }],
    })).rejects.toMatchObject({
      code: "rate_limited",
      message: "Daily AI limit reached.",
      retryAfterSec: 19,
    });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("blocks AI calls until consent is accepted", async () => {
    mockGetAiPreference.mockResolvedValue(null);

    await expect(chat({
      messages: [{ role: "user", content: "How did I do this week?" }],
    })).rejects.toMatchObject({ code: "consent" });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("maps function transport failures to offline", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: "FunctionsFetchError", context: undefined },
    });

    await expect(chat({
      messages: [{ role: "user", content: "How did I do this week?" }],
    })).rejects.toMatchObject({ code: "offline" });
  });

  it("retries server errors once and accepts a valid response", async () => {
    jest.useFakeTimers();
    mockInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          name: "FunctionsHttpError",
          context: new Response(JSON.stringify({ error: "Temporary failure." }), { status: 500 }),
        },
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: "Keep going." } }] },
        error: null,
      });

    try {
      const pending = chat({
        messages: [{ role: "user", content: "How did I do this week?" }],
      });
      await jest.advanceTimersByTimeAsync(1_000);
      await expect(pending).resolves.toMatchObject({
        choices: [{ message: { content: "Keep going." } }],
      });
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("shares one in-flight request for identical chat inputs", async () => {
    let complete!: (result: {
      data: { choices: { message: { content: string } }[] };
      error: null;
    }) => void;
    mockInvoke.mockImplementation(() => new Promise((resolve) => {
      complete = resolve;
    }));
    const request = { messages: [{ role: "user" as const, content: "How did I do this week?" }] };

    const first = chat(request);
    const second = chat(request);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    complete({ data: { choices: [{ message: { content: "Keep going." } }] }, error: null });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });
});
