const express = require("express");
const { rateLimit } = require("express-rate-limit");
const {
  loginAdmin,
  getAdminSession,
  logoutAdmin,
  listStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/requireAdmin");
const {
  listAdminElections,
  createElection,
  updateElection,
  activateElection,
  endElection,
  listEligibleStudents,
  listElectionCandidates,
  addCandidate,
} = require("../controllers/adminElectionController");

const router = express.Router();
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
});

router.post("/auth/login", loginRateLimit, loginAdmin);
router.get("/auth/me", requireAdmin, getAdminSession);
router.post("/auth/logout", logoutAdmin);
router.get("/students", requireAdmin, listStudents);
router.post("/students", requireAdmin, addStudent);
router.patch("/students/:studentId", requireAdmin, updateStudent);
router.delete("/students/:studentId", requireAdmin, deleteStudent);
router.get("/elections", requireAdmin, listAdminElections);
router.post("/elections", requireAdmin, createElection);
router.patch("/elections/:electionId", requireAdmin, updateElection);
router.post("/elections/:electionId/activate", requireAdmin, activateElection);
router.post("/elections/:electionId/end", requireAdmin, endElection);
router.get("/elections/:electionId/eligible-students", requireAdmin, listEligibleStudents);
router.get("/elections/:electionId/candidates", requireAdmin, listElectionCandidates);
router.post("/elections/:electionId/candidates", requireAdmin, addCandidate);

module.exports = router;