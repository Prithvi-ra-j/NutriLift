import Groq from "groq-sdk";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

let groqInstance: Groq | null = null;
let cachedApiKey: string | null = null;

export async function loadGroqApiKey() {
  if (Platform.OS !== 'web') {
    try {
      const key = await SecureStore.getItemAsync("GROQ_API_KEY");
      if (key) cachedApiKey = key;
    } catch (e) {
      console.error(e);
    }
  }
}

export function setGroqApiKey(key: string) {
  cachedApiKey = key;
  groqInstance = null; // Reset instance to use new key
  if (Platform.OS !== 'web') {
    SecureStore.setItemAsync("GROQ_API_KEY", key).catch(console.error);
  }
}

export function getGroqApiKey(): string | null {
  return cachedApiKey || Constants.expoConfig?.extra?.groqApiKey || process.env.GROQ_API_KEY || null;
}

// Lazy initialization of Groq client
export function getGroq(): Groq {
  if (!groqInstance) {
    const apiKey = getGroqApiKey();
    
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      throw new Error(
        "GROQ_API_KEY is not configured. Please add it to your profile settings or .env file."
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
  const apiKey = getGroqApiKey();
  return !!apiKey && apiKey !== "your_groq_api_key_here";
}
