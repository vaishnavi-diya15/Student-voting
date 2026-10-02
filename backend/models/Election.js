const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value instanceof Date && Number.isFinite(value.getTime()) && this.startTime < value;
        },
        message: "endTime must be a valid date later than startTime",
      },
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "ended"],
      default: "draft",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Election", electionSchema);