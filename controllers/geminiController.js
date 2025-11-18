const GeminiModel = require('../models/geminiModel');
const gemini = new GeminiModel(process.env.GEMINI_API_KEY);

class GeminiController {

  // One-shot endpoint
  static async generateResponse(req, res) {
    const { userPrompt, prePrompt } = req.body;
    if (!userPrompt) return res.status(400).json({ error: 'userPrompt is required' });

    try {
      const aiResponse = await gemini.sendPrompt(userPrompt, prePrompt);
      res.json({ response: aiResponse });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // SSE streaming endpoint using POST
  static async streamResponse(req, res) {
    const { userPrompt, prePrompt } = req.body; // <- read from POST body
  
    if (!userPrompt) return res.status(400).send('userPrompt required');
  
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  
    console.log("streamResponse received:", req.body);
  
    try {
      await gemini.streamPrompt(
        userPrompt,
        prePrompt,
        (chunk) => {
          console.log("Chunk sent to client:", chunk); // log each chunk
          res.write(`data: ${chunk}\n\n`);
          res.flush?.();
        },
        (err) => {
          console.error("Stream error:", err);
          res.write(`data: ERROR: ${err.message}\n\n`);
        },
        () => {
          console.log("Stream finished");
          res.write('data: [STREAM CLOSED]\n\n');
          res.end();
        }
      );
    } catch (err) {
      console.error("Stream exception:", err);
      res.write(`data: ERROR: ${err.message}\n\n`);
      res.end();
    }
  
    req.on('close', () => {
      console.log("Client disconnected");
      res.end();
    });
  }

}

module.exports = GeminiController;
