const Student = require("../models/Student");
const OtpChallenge = require("../models/OtpChallenge");
const emailService = require("../utils/emailService");
const {
  getExpiryMinutes,
  generateOtp,
  hashOtp,
  matchesOtp,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
} = require("../utils/otp");
const { createVotingSession, setSessionCookie } = require("../utils/votingSession");

const getEnrollmentNo = (req, res) => {
  const enrollmentNo = req.body?.enrollmentNo;
  if (typeof enrollmentNo !== "string" || !enrollmentNo.trim()) {
    res.status(400).json({ message: "Enrollment number is required." });
    return null;
  }
  return enrollmentNo.trim();
};

const findEligibleStudent = async (enrollmentNo) => {
  const student = await Student.findOne({ enrollmentNo })
    .select("course eligible hasVoted")
    .lean();

  if (!student) return { status: 404, message: "Student enrollment number was not found." };
  if (typeof student.course !== "string" || student.course.trim().toLowerCase() !== "mca") {
    return { status: 403, message: "Only MCA students can verify for this election." };
  }
  if (!student.eligible) return { status: 403, message: "This student is not eligible to vote." };
  if (student.hasVoted) {
    return { status: 403, message: "Voting is already completed for this student." };
  }

  return { student };
};

const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find().sort({ enrollmentNo: 1 }).lean();
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};

const verifyStudent = async (req, res, next) => {
  try {
    const enrollmentNo = getEnrollmentNo(req, res);
    if (!enrollmentNo) return;

    const result = await findEligibleStudent(enrollmentNo);
    if (!result.student) return res.status(result.status).json({ message: result.message });

    return res.status(200).json({
      verified: true,
      message: "Student verified. Continue to OTP verification.",
    });
  } catch (error) {
    return next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const enrollmentNo = getEnrollmentNo(req, res);
    if (!enrollmentNo) return;

    const result = await findEligibleStudent(enrollmentNo);
    if (!result.student) return res.status(result.status).json({ message: result.message });

    const student = await Student.findOne({ enrollmentNo }).select("_id email").lean();
    const now = new Date();
    const existingChallenge = await OtpChallenge.findOne({ studentId: student._id })
      .select("sentAt expiresAt")
      .lean();
    if (
      existingChallenge &&
      existingChallenge.expiresAt > now &&
      now - existingChallenge.sentAt < RESEND_COOLDOWN_MS
    ) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - existingChallenge.sentAt)) / 1000
      );
      return res.status(429).json({
        message: "Please wait before requesting another OTP.",
        retryAfterSeconds,
      });
    }

    const otp = generateOtp();
    const expiresInMinutes = getExpiryMinutes();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60_000);
    try {
      await emailService.sendOtpEmail({ to: student.email, otp, expiresInMinutes });
    } catch (error) {
      console.error(`[otp] Email delivery failed: ${error.code || error.message}`);
      return res.status(503).json({
        message:
          error.code === "SMTP_NOT_CONFIGURED"
            ? "OTP email delivery is not configured. Contact the administrator."
            : "Unable to send the OTP email right now. Please try again later.",
      });
    }

    await OtpChallenge.findOneAndUpdate(
      { studentId: student._id },
      {
        $set: {
          otpHash: hashOtp(otp),
          expiresAt,
          sentAt: now,
          attempts: 0,
          consumedAt: null,
        },
        $setOnInsert: { studentId: student._id },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "OTP sent to the email registered with this enrollment.",
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: expiresInMinutes * 60,
      resendAfterSeconds: RESEND_COOLDOWN_MS / 1000,
    });
  } catch (error) {
    return next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const enrollmentNo = getEnrollmentNo(req, res);
    if (!enrollmentNo) return;
    const otp = req.body?.otp;
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the 6-digit OTP." });
    }

    const result = await findEligibleStudent(enrollmentNo);
    if (!result.student) return res.status(result.status).json({ message: result.message });

    const student = await Student.findOne({ enrollmentNo }).select("_id").lean();
    const challenge = await OtpChallenge.findOne({ studentId: student._id }).select("+otpHash");
    if (!challenge) {
      return res.status(400).json({ message: "No active OTP was found. Request a new one." });
    }
    if (challenge.consumedAt) {
      return res.status(409).json({ message: "This OTP has already been verified." });
    }
    if (challenge.expiresAt <= new Date()) {
      await OtpChallenge.deleteOne({ _id: challenge._id });
      return res.status(410).json({ message: "The OTP has expired. Request a new one." });
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect attempts. Request a new OTP." });
    }

    if (!matchesOtp(otp, challenge.otpHash)) {
      const updatedChallenge = await OtpChallenge.findOneAndUpdate(
        { _id: challenge._id, attempts: { $lt: MAX_ATTEMPTS } },
        { $inc: { attempts: 1 } },
        { new: true }
      ).select("attempts");
      if (!updatedChallenge || updatedChallenge.attempts >= MAX_ATTEMPTS) {
        return res.status(429).json({ message: "Too many incorrect attempts. Request a new OTP." });
      }
      return res.status(400).json({ message: "The OTP is incorrect." });
    }

    await OtpChallenge.updateOne(
      { _id: challenge._id },
      { $set: { consumedAt: new Date(), attempts: MAX_ATTEMPTS }, $unset: { otpHash: 1 } }
    );
    const session = await createVotingSession(student._id);
    setSessionCookie(res, session.token, session.expiresAt);
    return res.status(200).json({
      verified: true,
      message: "Email OTP verified.",
      sessionExpiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getStudents, verifyStudent, sendOtp, verifyOtp };