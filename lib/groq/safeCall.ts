/**
 * Safe wrapper for Groq API calls with error handling and rate limiting
 */
export async function safeGroqCall<T>(
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }

    if (err?.status === 401) {
      throw new Error("AI service authentication failed. Please check the server configuration.");
    }

    if (err?.message?.includes("fetch") || err?.message?.includes("network")) {
      throw new Error("Network error. Please check your internet connection.");
    }

    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(err?.message || "An unexpected error occurred");
  }
}

export async function retryGroqCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      if (err?.status === 401) throw err;
      if (err?.status === 400) throw err;

      const delay = initialDelay * Math.pow(2, attempt);
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}
