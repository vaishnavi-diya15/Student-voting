const mongoose = require("mongoose");

const STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/** Human-readable MongoDB connection state for the health check. */
const getDatabaseStatus = () => {
  if (!process.env.MONGO_URI) return "not_configured";
  return STATES[mongoose.connection.readyState] || "unknown";
};

module.exports = { getDatabaseStatus };
