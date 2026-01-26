const axios = require("axios");

const BASE_URL = "https://openrouter.ai/api/v1";
const GEMMA_MODEL = "google/gemma-3-27b-it:free";
const DEEPSEEK_MODEL = "deepseek/deepseek-r1-0528:free";
const GPT_OSS_MODEL = "openai/gpt-oss-120b:free";

// Model mappings for different agents using the constants above
const MODEL_MAP = {
  "DeepSeek": DEEPSEEK_MODEL,
  "1": DEEPSEEK_MODEL,
  
  // Agent 2 (Gemini) - using Gemma
  "Gemma": GEMMA_MODEL,
  "2": GEMMA_MODEL,
  
  // Agent 3 (OpenAI) - using GPT OSS
  "GPT_OSS": GPT_OSS_MODEL,
  "3": GPT_OSS_MODEL,
};

// Default model fallback
const DEFAULT_MODEL = DEEPSEEK_MODEL;

/**
 * Get the appropriate model for an agent
 * @param {string|number} agentIdentifier - Agent name (e.g., "Claude"/"DeepSeek", "Gemini"/"Gemma", "OpenAI"/"GPT_OSS") or agentId (1, 2, 3)
 * @returns {string} The model identifier for OpenRouter
 */
function getModelForAgent(agentIdentifier) {
  if (!agentIdentifier) {
    return DEFAULT_MODEL;
  }
  
  const key = String(agentIdentifier);
  
  // Check if it's a numeric ID (1, 2, 3) - these are already in MODEL_MAP
  if (MODEL_MAP[key]) {
    return MODEL_MAP[key];
  }
  
  // Try direct lookup with the key as-is (for names like "DeepSeek", "Gemma", "GPT_OSS")
  if (MODEL_MAP[key]) {
    return MODEL_MAP[key];
  }
  
  // Try case-insensitive lookup for new names
  const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  if (MODEL_MAP[capitalizedKey]) {
    return MODEL_MAP[capitalizedKey];
  }
  
  // Fallback to default
  return DEFAULT_MODEL;
}

/**
 * One-shot OpenRouter call.
 * No classes, no streaming – just return the full content as a string.
 *
 * @param {string} userPrompt
 * @param {string} prePrompt
 * @param {string|number} agentIdentifier - Optional: Agent name or ID to determine which model to use
 * @returns {Promise<string>}
 */
async function sendOpenRouterPrompt(userPrompt, prePrompt = "", agentIdentifier = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[OpenRouter] No OPENROUTER_API_KEY provided");
  }

  // Determine which model to use based on agent
  const model = getModelForAgent(agentIdentifier);

  try {
    const messages = [];

    if (prePrompt && prePrompt.trim().length > 0) {
      messages.push({ role: "system", content: prePrompt });
    }

    messages.push({ role: "user", content: userPrompt });

    const url = `${BASE_URL}/chat/completions`;

    const response = await axios.post(
      url,
      {
        model: model,
        messages,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // Optional but recommended by OpenRouter
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "RSAF Problem 3 Board",
        },
      }
    );

    const choice = response.data.choices && response.data.choices[0];
    const content =
      choice?.message?.content ||
      choice?.delta?.content ||
      "";

    return content;
  } catch (error) {
    console.error("OpenRouter API Error:", error.response?.data || error.message);
    throw new Error("Failed to generate response from OpenRouter");
  }
}

module.exports = {
  sendOpenRouterPrompt,
  getModelForAgent,
  GEMMA_MODEL,
  DEEPSEEK_MODEL,
  GPT_OSS_MODEL,
};