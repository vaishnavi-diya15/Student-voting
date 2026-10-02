const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const AdminSession = require("../models/AdminSession");
const Student = require("../models/Student");
const Candidate = require("../models/Candidate");
const { getCookieValue } = require("../middleware/requireVotingSession");
const {
  ADMIN_SESSION_COOKIE,
  hashAdminToken,
  createAdminSession,
  setAdminCookie,
  clearAdminCookie,
} = require("../utils/adminSession");

const loginAdmin = async (req, res, next) => {
  try {
    const login = typeof req.body?.login === "string" ? req.body.login.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!login || !password) {
      return res.status(400).json({ message: "Username/email and password are required." });
    }

    const admin = await Admin.findOne({
      $or: [{ username: login }, { email: login.toLowerCase() }],
    }).select("+passwordHash");
    const passwordMatches = admin && await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid username/email or password." });
    }

    const session = await createAdminSession(admin._id);
    setAdminCookie(res, session.token, session.expiresAt);
    return res.status(200).json({
      authenticated: true,
      expiresAt: session.expiresAt.toISOString(),
      admin: { username: admin.username, email: admin.email },
    });
  } catch (error) {
    return next(error);
  }
};

const getAdminSession = (req, res) =>
  res.status(200).json({
    authenticated: true,
    expiresAt: req.adminSession.expiresAt.toISOString(),
    admin: req.admin,
  });

const logoutAdmin = async (req, res, next) => {
  try {
    const token = getCookieValue(req.headers.cookie, ADMIN_SESSION_COOKIE);
    if (token) await AdminSession.deleteOne({ tokenHash: hashAdminToken(token) });
    clearAdminCookie(res);
    return res.status(200).json({ message: "Admin session ended." });
  } catch (error) {
    return next(error);
  }
};

const listStudents = async (req, res, next) => {
  try {
    const students = await Student.find()
      .select("enrollmentNo name email mobile course semester eligible hasVoted createdAt")
      .sort({ enrollmentNo: 1 })
      .lean();
    return res.status(200).json(students);
  } catch (error) {
    return next(error);
  }
};

const studentFields = ["enrollmentNo", "name", "email", "mobile", "course", "semester", "eligible"];
const buildStudentData = (body, partial = false) => {
  const data = {};
  for (const field of studentFields) {
    if (Object.hasOwn(body, field)) data[field] = body[field];
    else if (!partial && !["mobile", "eligible"].includes(field)) data[field] = undefined;
  }
  if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();
  if (typeof data.enrollmentNo === "string") data.enrollmentNo = data.enrollmentNo.trim();
  if (typeof data.course === "string") data.course = data.course.trim();
  if (typeof data.name === "string") data.name = data.name.trim();
  return data;
};

const handleStudentWriteError = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "A student with this enrollment number already exists." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  return null;
};

const addStudent = async (req, res, next) => {
  try {
    const student = await Student.create(buildStudentData(req.body || {}));
    return res.status(201).json({
      _id: student._id,
      enrollmentNo: student.enrollmentNo,
      name: student.name,
      email: student.email,
      mobile: student.mobile,
      course: student.course,
      semester: student.semester,
      eligible: student.eligible,
      hasVoted: student.hasVoted,
      createdAt: student.createdAt,
    });
  } catch (error) {
    const response = handleStudentWriteError(error, res);
    return response || next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.studentId,
      { $set: buildStudentData(req.body || {}, true) },
      { new: true, runValidators: true, context: "query" }
    ).select("enrollmentNo name email mobile course semester eligible hasVoted createdAt");
    if (!student) return res.status(404).json({ message: "Student not found." });
    return res.status(200).json(student);
  } catch (error) {
    const response = handleStudentWriteError(error, res);
    return response || next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });
    if (student.hasVoted || await Candidate.exists({ studentId: student._id })) {
      return res.status(409).json({
        message: "Students who have voted or are registered as candidates cannot be deleted.",
      });
    }
    await student.deleteOne();
    return res.status(204).end();
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid student id." });
    return next(error);
  }
};

module.exports = {
  loginAdmin,
  getAdminSession,
  logoutAdmin,
  listStudents,
  addStudent,
  updateStudent,
  deleteStudent,
};