const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminSchema.pre("validate", function validateIdentity(next) {
  if (this.username || this.email) return next();
  this.invalidate("username", "An admin username or email is required");
  next();
});

module.exports = mongoose.model("Admin", adminSchema);