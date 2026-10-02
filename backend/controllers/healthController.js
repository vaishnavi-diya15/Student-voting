const { getDatabaseStatus } = require("../utils/dbStatus");

// GET /api/health
const getHealth = (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "student-voting-backend",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database: getDatabaseStatus(),
  });
};

module.exports = { getHealth };
