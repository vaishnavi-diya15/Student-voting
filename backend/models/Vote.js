const mongoose = require("mongoose");
const Candidate = require("./Candidate");
const Election = require("./Election");

const voteSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true,
  },
  transactionHash: { type: String, trim: true },
  votedAt: { type: Date, default: Date.now },
});

voteSchema.pre("validate", async function validateReferences() {
  if (this.electionId && !(await Election.exists({ _id: this.electionId }))) {
    this.invalidate("electionId", "Election reference does not exist");
  }
  if (this.candidateId && !(await Candidate.exists({ _id: this.candidateId }))) {
    this.invalidate("candidateId", "Candidate reference does not exist");
  }
});

module.exports = mongoose.model("Vote", voteSchema);