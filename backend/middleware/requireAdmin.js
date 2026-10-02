const AdminSession = require("../models/AdminSession");
const Admin = require("../models/Admin");
const { getCookieValue } = require("./requireVotingSession");
const {
  ADMIN_SESSION_COOKIE,
  hashAdminToken,
  clearAdminCookie,
} = require("../utils/adminSession");

const requireAdmin = async (req, res, next) => {
  try {
    const token = getCookieValue(req.headers.cookie, ADMIN_SESSION_COOKIE);
    if (!token) {
      return res.status(401).json({ message: "Admin authentication is required." });
    }

    const session = await AdminSession.findOne({ tokenHash: hashAdminToken(token) });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await AdminSession.deleteOne({ _id: session._id });
      clearAdminCookie(res);
      return res.status(401).json({ message: "Admin session is invalid or expired." });
    }

    const admin = await Admin.findById(session.adminId).select("username email").lean();
    if (!admin) {
      await AdminSession.deleteOne({ _id: session._id });
      clearAdminCookie(res);
      return res.status(401).json({ message: "Admin session is invalid or expired." });
    }

    req.admin = admin;
    req.adminSession = session;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireAdmin };