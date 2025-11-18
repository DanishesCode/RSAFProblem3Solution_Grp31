const axios = require('axios');

class GeminiModel {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = "gemini-2.0-flash";
  }

  // One-shot request
  async sendPrompt(userPrompt, prePrompt = '') {
    const url = `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`;
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
        headers: { "Content-Type": "application/json" }
      });
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Gemini API Error:", error.response?.data || error.message);
      throw new Error("Failed to generate response from Gemini API");
    }
  }

  /**
   * Simulated streaming: split full response into chunks and call onChunk
   */
  async streamPrompt(userPrompt, prePrompt = '', onChunk, onError, onComplete) {
    try {
      const fullResponse = await this.sendPrompt(userPrompt, prePrompt);

      // Split into 50-char chunks
      const chunks = fullResponse.match(/.{1,50}/g) || [fullResponse];

      for (const chunk of chunks) {
        onChunk(chunk);
        console.log("Chunk generated:", chunk);
        await new Promise(r => setTimeout(r, 50)); // simulate typing
      }

      onComplete();
    } catch (err) {
      if (onError) onError(err);
    }
  }
}

module.exports = GeminiModel;
