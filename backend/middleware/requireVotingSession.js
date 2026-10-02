const VotingSession = require("../models/VotingSession");
const {
  SESSION_COOKIE,
  hashSessionToken,
  clearSessionCookie,
} = require("../utils/votingSession");

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  const item = cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
};

const requireVotingSession = async (req, res, next) => {
  try {
    const token = getCookieValue(req.headers.cookie, SESSION_COOKIE);
    if (!token) {
      return res.status(401).json({ code: "SESSION_REQUIRED", message: "A valid session is required." });
    }

    const session = await VotingSession.findOne({ tokenHash: hashSessionToken(token) });
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ code: "SESSION_INVALID", message: "Session is invalid or expired." });
    }
    if (session.expiresAt <= new Date()) {
      await VotingSession.deleteOne({ _id: session._id });
      clearSessionCookie(res);
      return res.status(401).json({ code: "SESSION_EXPIRED", message: "Session expired. Start verification again." });
    }
    if (!session.authenticated) {
      clearSessionCookie(res);
      return res.status(401).json({ code: "SESSION_INVALID", message: "Session is invalid or expired." });
    }

    req.votingSession = session;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireVotingSession, getCookieValue };