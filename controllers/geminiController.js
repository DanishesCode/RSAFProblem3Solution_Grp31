const GeminiModel = require('../models/geminiModel');
const gemini = new GeminiModel(process.env.GEMINI_API_KEY);
const taskModel = require('../models/taskModel');

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

  // Process task: get task, call Gemini, save output
  static async processTask(req, res) {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    try {
      // Get task from database
      const taskRef = require('../firebaseAdmin').db.collection('task').doc(String(taskId));
      const taskSnap = await taskRef.get();
      
      if (!taskSnap.exists) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = { taskId: taskSnap.id, ...taskSnap.data() };

      // Build the prompt with task prompt and requirements
      // requirement is stored as a comma-separated string in Firestore
      const requirementsText = task.requirement || '';
      
      const userPrompt = task.prompt || '';
      const requirementsPrompt = requirementsText ? `\n\nRequirements: ${requirementsText}` : '';
      const fullPrompt = `${userPrompt}${requirementsPrompt}`;

      // Pre-prompt based on agent type (but all use Gemini)
      const prePrompt = `You are an AI Agent whose goal is to help the user create high-quality code, components, utilities, and documentation for GitHub repositories by strictly following their prompt and requirements. Analyze requests deeply, generate production-ready code using best practices with modularity and performance in mind, provide file-ready code with minimal helpful comments, avoid inventing requirements, suggest improvements when appropriate, and respond with a professional, helpful, precise, developer-focused tone using clear code blocks separated by filename and brief optional explanations only. Begin each response with a concise explanation/summary of the approach and decisions, then display the complete code blocks below.`;

      // Call Gemini API
      const agentOutput = await gemini.sendPrompt(fullPrompt, prePrompt);

      // Save output to database
      await taskModel.updateTaskAgentOutput(taskId, agentOutput);

      res.json({ 
        success: true,
        agentOutput: agentOutput,
        taskId: taskId
      });
    } catch (error) {
      console.error('Error processing task with Gemini:', error);
      res.status(500).json({ error: error.message || 'Failed to process task with Gemini' });
    }
  }

}

module.exports = GeminiController;
