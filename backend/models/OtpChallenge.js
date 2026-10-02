const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    unique: true,
  },
  otpHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  sentAt: { type: Date, required: true, default: Date.now },
  attempts: { type: Number, required: true, default: 0, min: 0 },
  consumedAt: { type: Date, default: null },
});

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);