const { createBacklogItem, updateBacklogItemStatus,getBacklogsByUserId } = require("../models/taskModel");
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
const getBacklogsByUser = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).send("Missing userId in request.");
    }

    const data = await getBacklogsByUserId(userId);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to retrieve user backlogs");
  }
};



module.exports = {
  createBacklog,
  updateStatus, 
  getBacklogsByUser
};