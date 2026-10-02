const { createHash, randomBytes } = require("node:crypto");
const AdminSession = require("../models/AdminSession");

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const hashAdminToken = (token) => createHash("sha256").update(token).digest("hex");

const adminCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/admin",
});

const createAdminSession = async (adminId) => {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ADMIN_SESSION_TTL_MS);
  await AdminSession.findOneAndUpdate(
    { adminId },
    {
      $set: { tokenHash: hashAdminToken(token), createdAt, expiresAt },
      $setOnInsert: { adminId },
    },
    { upsert: true, new: true, runValidators: true }
  );
  return { token, expiresAt };
};

const setAdminCookie = (res, token, expiresAt) => {
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    ...adminCookieOptions(),
    expires: expiresAt,
  });
};

const clearAdminCookie = (res) => res.clearCookie(ADMIN_SESSION_COOKIE, adminCookieOptions());

module.exports = {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  hashAdminToken,
  adminCookieOptions,
  createAdminSession,
  setAdminCookie,
  clearAdminCookie,
};