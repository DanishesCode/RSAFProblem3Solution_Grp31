const { createBacklogItem } = require("../models/taskModel");

const createBacklog = async (req, res) => {
  try {
    const data = await createBacklogItem(req.body);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create backlog item");
  }
};

module.exports = {
  createBacklog
};
