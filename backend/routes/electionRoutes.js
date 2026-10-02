const express = require("express");
const {
	getElections,
	getActiveElection,
	getElectionDetails,
	getElectionCandidates,
} = require("../controllers/electionController");
const { requireVotingSession } = require("../middleware/requireVotingSession");

const router = express.Router();

router.get("/", requireVotingSession, getElections);
router.get("/active", requireVotingSession, getActiveElection);
router.get("/:electionId/candidates", requireVotingSession, getElectionCandidates);
router.get("/:electionId", requireVotingSession, getElectionDetails);

module.exports = router;