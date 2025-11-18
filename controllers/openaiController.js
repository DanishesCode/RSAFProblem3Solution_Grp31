const OpenAIModel = require("../models/openaiModel");
const openai = new OpenAIModel(process.env.OPENAI_API_KEY);

class OpenAIController {
  static async generateResponse(req, res) {
    const { userPrompt, prePrompt } = req.body;
    if (!userPrompt) return res.status(400).json({ error: "userPrompt is required" });

    try {
      const aiResponse = await openai.sendPrompt(userPrompt, prePrompt);
      res.json({ response: aiResponse });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async streamResponse(req, res) {
    const { userPrompt, prePrompt } = req.body;
    if (!userPrompt) return res.status(400).send("userPrompt required");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    console.log("OpenAI stream started");

    try {
      await openai.streamPrompt(
        userPrompt,
        prePrompt,
        (chunk) => {
          // DO NOT TRIM — send raw
          res.write(`data: ${chunk}\n\n`);
          res.flush?.();
        },
        (err) => {
          console.error("OpenAI Stream Error:", err.message);
          res.write(`data: ERROR: ${err.message}\n\n`);
        },
        () => {
          res.write("data: [STREAM CLOSED]\n\n");
          res.end();
        }
      );
    } catch (err) {
      console.error("OpenAI Stream Fatal Error:", err.message);
      res.write(`data: ERROR: ${err.message}\n\n`);
      res.end();
    }

    req.on("close", () => {
      console.log("Client disconnected from OpenAI SSE");
      res.end();
    });
  }
}

module.exports = OpenAIController;
