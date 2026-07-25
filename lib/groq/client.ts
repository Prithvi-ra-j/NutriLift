import Groq from "groq-sdk";
import Constants from "expo-constants";

let groqInstance: Groq | null = null;

// Lazy initialization of Groq client
export function getGroq(): Groq {
  if (!groqInstance) {
    const apiKey = Constants.expoConfig?.extra?.groqApiKey || process.env.GROQ_API_KEY;
    
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      throw new Error(
        "GROQ_API_KEY is not configured. Please add it to your .env file and restart the dev server."
      );
    }
    
    groqInstance = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for React Native
    });
  }
  
  return groqInstance;
}

// For backward compatibility
export const groq = new Proxy({} as Groq, {
  get(target, prop) {
    return getGroq()[prop as keyof Groq];
  }
});

// Check if Groq is configured
export function isGroqConfigured(): boolean {
  const apiKey = Constants.expoConfig?.extra?.groqApiKey || process.env.GROQ_API_KEY;
  return !!apiKey && apiKey !== "your_groq_api_key_here";
}
