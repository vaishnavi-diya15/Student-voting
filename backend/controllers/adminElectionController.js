const mongoose = require("mongoose");
const Election = require("../models/Election");
const Candidate = require("../models/Candidate");
const Student = require("../models/Student");

const electionFields = ["title", "description", "startTime", "endTime"];

const electionData = (body = {}) => {
  const data = {};
  for (const field of electionFields) {
    if (Object.hasOwn(body, field)) data[field] = body[field];
  }
  if (typeof data.title === "string") data.title = data.title.trim();
  if (typeof data.description === "string") data.description = data.description.trim();
  return data;
};

const validationError = (error, res) => {
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  return null;
};

const listAdminElections = async (req, res, next) => {
  try {
    const elections = await Election.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(elections);
  } catch (error) {
    return next(error);
  }
};

const createElection = async (req, res, next) => {
  try {
    const status = req.body?.status || "draft";
    if (!["draft", "scheduled"].includes(status)) {
      return res.status(400).json({ message: "An election must start as draft or scheduled." });
    }
    const election = await Election.create({ ...electionData(req.body), status });
    return res.status(201).json(election);
  } catch (error) {
    return validationError(error, res) || next(error);
  }
};

const updateElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election) return res.status(404).json({ message: "Election not found." });
    if (!["draft", "scheduled"].includes(election.status)) {
      return res.status(409).json({ message: "Active or ended elections cannot be edited." });
    }

    if (Object.hasOwn(req.body || {}, "status")) {
      if (!["draft", "scheduled"].includes(req.body.status)) {
        return res.status(400).json({ message: "Use the activate or end action to change election state." });
      }
      election.status = req.body.status;
    }
    Object.assign(election, electionData(req.body));
    await election.save();
    return res.status(200).json(election);
  } catch (error) {
    return validationError(error, res) || next(error);
  }
};

const activateElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election) return res.status(404).json({ message: "Election not found." });
    if (election.status !== "scheduled") {
      return res.status(409).json({ message: "Only scheduled elections can be activated." });
    }
    const now = new Date();
    if (election.startTime > now || election.endTime <= now) {
      return res.status(409).json({ message: "Election can only be activated between its start and end times." });
    }
    election.status = "active";
    await election.save();
    return res.status(200).json(election);
  } catch (error) {
    return validationError(error, res) || next(error);
  }
};

const endElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election) return res.status(404).json({ message: "Election not found." });
    if (election.status !== "active") {
      return res.status(409).json({ message: "Only active elections can be ended." });
    }
    election.status = "ended";
    await election.save();
    return res.status(200).json(election);
  } catch (error) {
    return validationError(error, res) || next(error);
  }
};

const findEditableElection = async (electionId, res) => {
  if (!mongoose.isValidObjectId(electionId)) {
    res.status(400).json({ message: "Invalid election id." });
    return null;
  }
  const election = await Election.findById(electionId).select("title status").lean();
  if (!election) {
    res.status(404).json({ message: "Election not found." });
    return null;
  }
  if (!["draft", "scheduled"].includes(election.status)) {
    res.status(409).json({ message: "Candidates can only be managed for draft or scheduled elections." });
    return null;
  }
  return election;
};

const listEligibleStudents = async (req, res, next) => {
  try {
    const election = await findEditableElection(req.params.electionId, res);
    if (!election) return;
    const selected = await Candidate.find({ electionId: election._id }).select("studentId").lean();
    const students = await Student.find({
      course: { $regex: /^mca$/i },
      eligible: true,
      _id: { $nin: selected.map((candidate) => candidate.studentId) },
    })
      .select("name enrollmentNo course semester")
      .sort({ enrollmentNo: 1 })
      .lean();
    return res.status(200).json(students);
  } catch (error) {
    return next(error);
  }
};

const listElectionCandidates = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId)
      .select("title status")
      .lean();
    if (!election) return res.status(404).json({ message: "Election not found." });
    const candidates = await Candidate.find({ electionId: election._id })
      .select("manifesto createdAt")
      .populate({ path: "studentId", select: "name enrollmentNo course semester eligible" })
      .lean();
    return res.status(200).json({ election, candidates });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid election id." });
    return next(error);
  }
};

const addCandidate = async (req, res, next) => {
  try {
    const election = await findEditableElection(req.params.electionId, res);
    if (!election) return;
    if (typeof req.body?.studentId !== "string" || !mongoose.isValidObjectId(req.body.studentId)) {
      return res.status(400).json({ message: "Select an existing student from the eligible list." });
    }
    const student = await Student.findById(req.body.studentId).select("course eligible").lean();
    if (!student) return res.status(404).json({ message: "Student not found." });
    if (student.course.trim().toLowerCase() !== "mca") {
      return res.status(400).json({ message: "Candidate must be an MCA student." });
    }
    if (!student.eligible) return res.status(400).json({ message: "Candidate must be eligible." });
    const candidate = await Candidate.create({
      electionId: election._id,
      studentId: student._id,
      manifesto: typeof req.body.manifesto === "string" ? req.body.manifesto.trim() : "",
    });
    const created = await Candidate.findById(candidate._id)
      .select("manifesto createdAt")
      .populate({ path: "studentId", select: "name enrollmentNo course semester eligible" })
      .lean();
    return res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This student is already a candidate for this election." });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  listAdminElections,
  createElection,
  updateElection,
  activateElection,
  endElection,
  listEligibleStudents,
  listElectionCandidates,
  addCandidate,
};