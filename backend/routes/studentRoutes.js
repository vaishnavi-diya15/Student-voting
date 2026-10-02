const express = require("express");
const {
	getStudents,
	verifyStudent,
	sendOtp,
	verifyOtp,
} = require("../controllers/studentController");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/", requireAdmin, getStudents);
router.post("/verify", verifyStudent);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;