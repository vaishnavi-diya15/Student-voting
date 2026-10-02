const VotingSession = require("../models/VotingSession");
const {
  SESSION_COOKIE,
  hashSessionToken,
  clearSessionCookie,
} = require("../utils/votingSession");
const { getCookieValue } = require("../middleware/requireVotingSession");

const getSessionTest = (req, res) => {
  res.status(200).json({
    authenticated: true,
    expiresAt: req.votingSession.expiresAt.toISOString(),
  });
};

const logout = async (req, res, next) => {
  try {
    const token = getCookieValue(req.headers.cookie, SESSION_COOKIE);
    if (token) {
      await VotingSession.deleteOne({ tokenHash: hashSessionToken(token) });
    }
    clearSessionCookie(res);
    return res.status(200).json({ message: "Session ended. Start verification again to continue." });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getSessionTest, logout };