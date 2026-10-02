const { createHmac, randomBytes, randomInt, timingSafeEqual } = require("node:crypto");

const processSecret = randomBytes(32).toString("hex");
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30_000;

const getExpiryMinutes = () => {
  const minutes = Number.parseInt(process.env.OTP_EXPIRY_MINUTES, 10);
  return Number.isInteger(minutes) && minutes > 0 ? minutes : 5;
};

const generateOtp = () => randomInt(0, 1_000_000).toString().padStart(6, "0");

const hashOtp = (otp) =>
  createHmac("sha256", process.env.OTP_HASH_SECRET || processSecret)
    .update(otp)
    .digest("hex");

const matchesOtp = (otp, storedHash) => {
  const submittedHash = Buffer.from(hashOtp(otp), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return submittedHash.length === expectedHash.length && timingSafeEqual(submittedHash, expectedHash);
};

module.exports = {
  getExpiryMinutes,
  generateOtp,
  hashOtp,
  matchesOtp,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
};