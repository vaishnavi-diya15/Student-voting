const { createHash, randomBytes } = require("node:crypto");
const VotingSession = require("../models/VotingSession");

const SESSION_COOKIE = "voting_session";
const SESSION_TTL_MS = 5 * 60 * 1000;

const hashSessionToken = (token) => createHash("sha256").update(token).digest("hex");

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
});

const createVotingSession = async (studentId) => {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);

  await VotingSession.findOneAndUpdate(
    { studentId },
    {
      $set: {
        tokenHash: hashSessionToken(token),
        authenticated: true,
        createdAt,
        expiresAt,
      },
      $setOnInsert: { studentId },
    },
    { upsert: true, new: true, runValidators: true }
  );

  return { token, expiresAt };
};

const setSessionCookie = (res, token, expiresAt) => {
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(),
    expires: expiresAt,
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
};

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  hashSessionToken,
  cookieOptions,
  createVotingSession,
  setSessionCookie,
  clearSessionCookie,
};