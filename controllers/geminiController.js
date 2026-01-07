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



}

module.exports = GeminiController;
