const mongoose = require("mongoose");
const Election = require("./Election");
const Student = require("./Student");

const candidateSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    manifesto: { type: String, trim: true, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

candidateSchema.pre("validate", async function validateReferences() {
  if (this.studentId) {
    const student = await Student.findById(this.studentId).select("course eligible").lean();
    if (!student) this.invalidate("studentId", "Student reference does not exist");
    else if (student.course.trim().toLowerCase() !== "mca") {
      this.invalidate("studentId", "Candidate must be an MCA student");
    } else if (!student.eligible) {
      this.invalidate("studentId", "Candidate must be eligible");
    }
  }
  if (this.electionId) {
    const election = await Election.findById(this.electionId).select("status").lean();
    if (!election) this.invalidate("electionId", "Election reference does not exist");
    else if (!["draft", "scheduled"].includes(election.status)) {
      this.invalidate("electionId", "Candidates can only be changed for draft or scheduled elections");
    }
  }
});

candidateSchema.index({ electionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Candidate", candidateSchema);