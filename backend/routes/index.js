const express = require("express");
const healthRoutes = require("./healthRoutes");
const studentRoutes = require("./studentRoutes");
const electionRoutes = require("./electionRoutes");
const sessionRoutes = require("./sessionRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

// All routes are mounted under /api (see server.js)
router.use("/health", healthRoutes);
router.use("/students", studentRoutes);
router.use("/elections", electionRoutes);
router.use("/session", sessionRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
