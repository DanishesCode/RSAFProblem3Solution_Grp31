const { createBacklogItem, updateBacklogItemStatus } = require("../models/taskModel");
const createBacklog = async (req, res) => {
  try {
    const data = await createBacklogItem(req.body);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create backlog item");
  }
};

const updateStatus = async (req, res) => {
  try {
    const { taskId, status } = req.body; // Extract taskId and status from the request body
    if (!taskId || !status) {
      return res.status(400).send("Missing taskId or status in request body.");
    }
    const data = await updateBacklogItemStatus(taskId, status);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update backlog item status");
  }
};

module.exports = {
  createBacklog,
  updateStatus, 
};