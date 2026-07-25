/**
 * Safe wrapper for Groq API calls with error handling and rate limiting
 */
export async function safeGroqCall<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    // Rate limit error
    if (err?.status === 429) {
      console.warn("⚠️ Groq rate limit hit — retry later");
      // You could implement exponential backoff here
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    
    // Authentication error
    if (err?.status === 401) {
      console.error("❌ Groq authentication failed — check API key");
      throw new Error("API authentication failed. Please check your Groq API key.");
    }
    
    // Network error
    if (err?.message?.includes("fetch") || err?.message?.includes("network")) {
      console.error("❌ Network error:", err?.message);
      throw new Error("Network error. Please check your internet connection.");
    }
    
    // Generic error
    console.error("❌ Groq API error:", err?.message || err);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw new Error(err?.message || "An unexpected error occurred");
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryGroqCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      // Don't retry on auth errors
      if (err?.status === 401) {
        throw err;
      }
      
      // Don't retry on validation errors
      if (err?.status === 400) {
        throw err;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      
      if (attempt < maxRetries - 1) {
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}
