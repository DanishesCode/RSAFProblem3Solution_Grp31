const axios = require("axios");

const BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-r1-0528:free";

/**
 * One-shot OpenRouter call.
 * No classes, no streaming – just return the full content as a string.
 *
 * @param {string} userPrompt
 * @param {string} prePrompt
 * @returns {Promise<string>}
 */
async function sendOpenRouterPrompt(userPrompt, prePrompt = "") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[OpenRouter] No OPENROUTER_API_KEY provided");
  }

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
        model: DEFAULT_MODEL,
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
};