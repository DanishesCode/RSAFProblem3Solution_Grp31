const { sendOpenRouterPrompt } = require("../models/openrouterModel");
const taskModel = require("../models/taskModel");

class OpenRouterController {
  /**
   * Simple non-streaming completion endpoint
   * Body: { userPrompt: string, prePrompt?: string, agentIdentifier?: string|number }
   */
  static async generateResponse(req, res) {
    const { userPrompt, prePrompt, agentIdentifier } = req.body || {};
    if (!userPrompt) {
      return res.status(400).json({ error: "userPrompt is required" });
    }

    try {
      const aiResponse = await sendOpenRouterPrompt(userPrompt, prePrompt, agentIdentifier);
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("OpenRouter generateResponse error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response from OpenRouter" });
    }
  }

  /**
   * Process a task by ID:
   *  - Load task from Firestore
   *  - Build prompt from task.prompt + requirement
   *  - Call OpenRouter with the appropriate model based on the task's assigned agent
   *  - Save agentOutput back to Firestore
   */
  static async processTask(req, res) {
    const { taskId } = req.body || {};

    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    try {
      // Fetch task document directly from Firestore
      const { db } = require("../firebaseAdmin");
      const taskRef = db.collection("task").doc(String(taskId));
      const taskSnap = await taskRef.get();

      if (!taskSnap.exists) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = { taskId: taskSnap.id, ...taskSnap.data() };

      // requirement is stored as a comma-separated string in Firestore
      const requirementsText = task.requirement || "";
      const userPrompt = task.prompt || "";
      const requirementsPrompt = requirementsText
        ? `\n\nRequirements: ${requirementsText}`
        : "";
      const fullPrompt = `${userPrompt}${requirementsPrompt}`;

      const prePrompt =
        "You are an expert software engineer. The user prompt and requirements describe changes to a codebase. STRICT RULES:\n" +
        "1) ONLY return code and necessary file headers/imports.\n" +
        '2) DO NOT return any natural language explanation, comments, or markdown like ```.\n' +
        "3) If multiple files are needed, concatenate them one after another with clear file path comments like // file: src/file.js.\n" +
        "4) Prefer complete, ready-to-paste files or functions.\n" +
        "5) Never invent requirements beyond what is in the prompt + requirements.\n";

      // Determine which model to use based on the task's assigned agent
      const agentIdentifier = task.assignedAgent || task.agentId || task.agentid;
      
      // Call OpenRouter with the appropriate model for this agent
      const agentOutput = await sendOpenRouterPrompt(fullPrompt, prePrompt, agentIdentifier);

      // Save output to database using existing helper
      await taskModel.updateTaskAgentOutput(taskId, agentOutput);

      res.json({
        success: true,
        agentOutput,
        taskId,
      });
    } catch (error) {
      console.error("Error processing task with OpenRouter:", error);
      res
        .status(500)
        .json({
          error:
            error.message || "Failed to process task with OpenRouter",
        });
    }
  }
}

module.exports = OpenRouterController;

