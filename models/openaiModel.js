const OpenAI = require("openai");

class OpenAIModel {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
    this.model = "gpt-4.1-mini"; // or "gpt-4.1" / "o3-mini"
  }

  // One-shot request
  async sendPrompt(userPrompt, prePrompt = "") {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prePrompt },
          { role: "user", content: userPrompt }
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error("Failed to generate response from OpenAI");
    }
  }

  // FIXED STREAMING — Gemini-style chunk merging
  async streamPrompt(userPrompt, prePrompt = "", onChunk, onError, onComplete) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prePrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true
      });

      let buffer = "";

      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content;

        if (delta !== undefined) {
          buffer += delta;

          // flush on sentence boundary, space, or code fence
          if (
            delta.includes(" ") ||
            delta.includes("\n") ||
            delta.includes(".") ||
            delta.includes(";") ||
            delta.includes("```")
          ) {
            onChunk(buffer);
            buffer = "";
          }
        }
      }

      // flush leftovers
      if (buffer.length > 0) onChunk(buffer);

      onComplete();
    } catch (err) {
      onError(err);
    }
  }
}

module.exports = OpenAIModel;
