jest.mock("../gateway", () => ({
  AiError: class AiError extends Error {},
  chat: jest.fn(),
}));

import { chat } from "../gateway";
import { generateCoachReply } from "../coach";

const mockChat = jest.mocked(chat);

describe("coach response handling", () => {
  beforeEach(() => mockChat.mockReset());

  it("clamps suggested nutrition targets before showing them", async () => {
    mockChat.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            message: "A small adjustment may be appropriate.",
            target_suggestion: {
              calories: 900,
              protein_g: 300,
              carbs_g: 1,
              fat_g: 1,
            },
          }),
        },
      }],
    } as Awaited<ReturnType<typeof chat>>);

    const response = await generateCoachReply(
      "Safety prompt",
      [{ role: "user", content: "Should I adjust my targets?" }],
      { calories: 1_600, protein_g: 100, carbs_g: 150, fat_g: 60 },
      1_500,
    );

    expect(response).toContain("Suggested targets (not saved): 1500 kcal");
    expect(response).toContain("110 g protein");
    expect(response).toContain("135 g carbs");
    expect(response).toContain("54 g fat");
  });

  it("repairs an invalid JSON response once", async () => {
    mockChat
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"message":' } }],
      } as Awaited<ReturnType<typeof chat>>)
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"message":"Keep the plan steady.","target_suggestion":null}' } }],
      } as Awaited<ReturnType<typeof chat>>);

    await expect(generateCoachReply(
      "Safety prompt",
      [{ role: "user", content: "How is my progress?" }],
      { calories: 2_000, protein_g: 120, carbs_g: 200, fat_g: 70 },
      1_500,
    )).resolves.toBe("Keep the plan steady.");
    expect(mockChat).toHaveBeenCalledTimes(2);
  });
});
