const express = require("express");
const { getSessionTest, logout } = require("../controllers/sessionController");
const { requireVotingSession } = require("../middleware/requireVotingSession");

const router = express.Router();

router.get("/test", requireVotingSession, getSessionTest);
router.post("/logout", logout);

module.exports = router;