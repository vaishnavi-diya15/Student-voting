const Election = require("../models/Election");
const Candidate = require("../models/Candidate");

const getElections = async (req, res, next) => {
  try {
    const elections = await Election.find({ status: "active" }).sort({ createdAt: -1 }).lean();
    res.status(200).json(elections);
  } catch (error) {
    next(error);
  }
};

const getActiveElection = async (req, res, next) => {
  try {
    const election = await Election.findOne({ status: "active" }).lean();
    if (!election) return res.status(404).json({ message: "There is no active election." });
    return res.status(200).json(election);
  } catch (error) {
    return next(error);
  }
};

const getElectionDetails = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId).lean();
    if (!election || election.status !== "active") {
      return res.status(404).json({ message: "Active election was not found." });
    }
    return res.status(200).json(election);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid election id." });
    return next(error);
  }
};

const getElectionCandidates = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.electionId).select("status").lean();
    if (!election || election.status !== "active") {
      return res.status(404).json({ message: "Active election was not found." });
    }
    const candidates = await Candidate.find({ electionId: election._id })
      .select("manifesto createdAt")
      .populate({ path: "studentId", select: "name course" })
      .lean();
    return res.status(200).json(candidates);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid election id." });
    return next(error);
  }
};

module.exports = { getElections, getActiveElection, getElectionDetails, getElectionCandidates };