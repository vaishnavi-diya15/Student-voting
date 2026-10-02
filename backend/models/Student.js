const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    enrollmentNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },
    mobile: { type: String, trim: true },
    course: { type: String, required: true, trim: true },
    semester: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Semester must be a whole number" },
    },
    eligible: { type: Boolean, default: true },
    hasVoted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Student", studentSchema);