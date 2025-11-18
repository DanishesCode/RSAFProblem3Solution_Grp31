const axios = require('axios');

class GeminiModel {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = "gemini-2.0-flash";  // <-- set your model here
  }

  async sendPrompt(userPrompt, prePrompt = '') {
    const url = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${prePrompt}\n${userPrompt}` }
          ]
        }
      ]
    };

    try {
      const response = await axios.post(url, body, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      return response.data.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error("Gemini API Error:", error.response?.data || error.message);
      throw new Error("Failed to generate response from Gemini API");
    }
  }
}

module.exports = GeminiModel;
