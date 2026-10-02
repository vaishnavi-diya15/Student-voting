const mongoose = require("mongoose");

const votingSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    unique: true,
  },
  tokenHash: { type: String, required: true, unique: true, select: false },
  authenticated: { type: Boolean, required: true, default: true },
  createdAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true },
});

votingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("VotingSession", votingSessionSchema);