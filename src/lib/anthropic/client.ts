import Anthropic from "@anthropic-ai/sdk";

let anthropicClientInstance: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is missing");
    }
    anthropicClientInstance = new Anthropic({
      apiKey,
    });
  }
  return anthropicClientInstance;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
}
