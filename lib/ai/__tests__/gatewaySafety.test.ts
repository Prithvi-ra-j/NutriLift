jest.mock("../../data/aiPreferences", () => ({
  getAiPreference: jest.fn().mockResolvedValue("accepted"),
}));

jest.mock("../../supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { chat } from "../gateway";
import { supabase } from "../../supabase/client";

const mockInvoke = jest.mocked(supabase!.functions.invoke);

describe("AI gateway eating-safety gate", () => {
  beforeEach(() => mockInvoke.mockReset());

  it("returns support without invoking the model for risk-related input", async () => {
    await expect(chat({
      messages: [{ role: "user", content: "I have been restricting food all week." }],
    })).rejects.toMatchObject({
      code: "safety",
      message: expect.stringContaining("findahelpline.com"),
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("allows ordinary nutrition questions through the safety gate", async () => {
    mockInvoke.mockResolvedValue({
      data: { choices: [{ message: { content: "Try a balanced breakfast." } }] },
      error: null,
    });

    await expect(chat({
      messages: [{ role: "user", content: "Can you suggest a balanced breakfast?" }],
    })).resolves.toEqual({
      choices: [{ message: { content: "Try a balanced breakfast." } }],
    });

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
