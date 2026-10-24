export const AI_SAFETY_RESPONSE =
  "I’m sorry you’re dealing with this. You deserve support without judgment. I can’t help with food or body targets right now. Consider talking with someone you trust or a qualified professional. For confidential support, find a local helpline at https://findahelpline.com.";

const riskPatterns = [
  /\b(?:restrict(?:ing|ion)?|starv(?:e|ing|ation)|not eating)\b/i,
  /\b(?:purge|purging|make myself throw up|vomit after eating)\b/i,
  /\b(?:binge(?:d|ing)?|out of control eating)\b/i,
  /\b(?:guilt|guilty|ashamed|shame)\b.{0,40}\b(?:food|eating|meal|calories|body)\b/i,
  /\b(?:food|eating|meal|calories|body)\b.{0,40}\b(?:guilt|guilty|ashamed|shame)\b/i,
  /\b(?:hate myself|hate my body|disgusting body|my body is disgusting|self[- ]hate)\b/i,
  /\b(?:i am|i'm|im) (?:worthless|a burden)\b/i,
  /\b(?:i don't|i do not) deserve to eat\b/i,
  /\b(?:i deserve to|should) punish myself\b/i,
];

export function containsEatingSafetyRisk(text: string): boolean {
  return riskPatterns.some((pattern) => pattern.test(text));
}
