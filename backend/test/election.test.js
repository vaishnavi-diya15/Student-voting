require("dotenv").config();

const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const test = require("node:test");
const app = require("../server");
const Admin = require("../models/Admin");
const AdminSession = require("../models/AdminSession");
const Candidate = require("../models/Candidate");
const Election = require("../models/Election");
const Student = require("../models/Student");
const VotingSession = require("../models/VotingSession");
const { createAdminSession } = require("../utils/adminSession");
const { createVotingSession } = require("../utils/votingSession");

test("admin manages election lifecycle and assigns only eligible MCA students", async (context) => {
  if (!process.env.MONGO_URI) {
    context.skip("Set MONGO_URI to run MongoDB integration checks");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "student_voting",
    serverSelectionTimeoutMS: 5000,
  });

  const suffix = randomUUID();
  const enrollmentNumbers = {
    eligible: `MCA-ELECTION-${suffix}-1`,
    nonMca: `MCA-ELECTION-${suffix}-2`,
    ineligible: `MCA-ELECTION-${suffix}-3`,
  };
  const title = `Phase 8 Election ${suffix}`;
  let admin;
  let server;
  let election;
  let fixtureStudentIds = [];

  try {
    await Admin.init();
    await AdminSession.init();
    await Election.init();
    await Candidate.init();
    await Student.init();
    await VotingSession.init();

    admin = await Admin.create({
      username: `phase8-admin-${suffix}`,
      email: `phase8.${suffix}@example.test`,
      passwordHash: "phase-eight-test-hash",
    });
    const adminSession = await createAdminSession(admin._id);

    const [eligibleStudent, nonMcaStudent, ineligibleStudent] = await Student.create([
      {
        enrollmentNo: enrollmentNumbers.eligible,
        name: "Election Candidate Test",
        email: `candidate.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
      },
      {
        enrollmentNo: enrollmentNumbers.nonMca,
        name: "Non MCA Candidate Test",
        email: `nonmca.${suffix}@example.test`,
        course: "BCA",
        semester: 3,
      },
      {
        enrollmentNo: enrollmentNumbers.ineligible,
        name: "Ineligible Candidate Test",
        email: `ineligible.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
        eligible: false,
      },
    ]);
    fixtureStudentIds = [eligibleStudent._id, nonMcaStudent._id, ineligibleStudent._id];
    const studentSession = await createVotingSession(eligibleStudent._id);

    server = app.listen(0);
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = (path, { method = "GET", body, cookie } = {}) =>
      fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const adminCookie = `admin_session=${adminSession.token}`;
    const studentCookie = `voting_session=${studentSession.token}`;
    const electionsPath = "/api/admin/elections";

    const unauthorized = await request(electionsPath);
    assert.equal(unauthorized.status, 401);

    const invalidDates = await request(electionsPath, {
      method: "POST",
      cookie: adminCookie,
      body: {
        title,
        startTime: "2026-11-10T15:00:00.000Z",
        endTime: "2026-11-10T14:00:00.000Z",
      },
    });
    assert.equal(invalidDates.status, 400);

    const create = await request(electionsPath, {
      method: "POST",
      cookie: adminCookie,
      body: {
        title,
        description: "Election lifecycle integration fixture",
        startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: "draft",
      },
    });
    assert.equal(create.status, 201);
    election = await create.json();
    assert.equal(election.status, "draft");

    const update = await request(`${electionsPath}/${election._id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { title: `${title} Updated`, status: "scheduled" },
    });
    assert.equal(update.status, 200);
    election = await update.json();
    assert.equal(election.title, `${title} Updated`);
    assert.equal(election.status, "scheduled");

    const invalidCandidateStudent = await request(
      `${electionsPath}/${election._id}/candidates`,
      { method: "POST", cookie: adminCookie, body: { studentId: new mongoose.Types.ObjectId().toString() } }
    );
    assert.equal(invalidCandidateStudent.status, 404);
    const nonMcaCandidate = await request(`${electionsPath}/${election._id}/candidates`, {
      method: "POST",
      cookie: adminCookie,
      body: { studentId: nonMcaStudent._id.toString() },
    });
    assert.equal(nonMcaCandidate.status, 400);
    const ineligibleCandidate = await request(`${electionsPath}/${election._id}/candidates`, {
      method: "POST",
      cookie: adminCookie,
      body: { studentId: ineligibleStudent._id.toString() },
    });
    assert.equal(ineligibleCandidate.status, 400);

    const eligibleStudents = await request(`${electionsPath}/${election._id}/eligible-students`, {
      cookie: adminCookie,
    });
    assert.equal(eligibleStudents.status, 200);
    const eligibleStudentIds = (await eligibleStudents.json()).map((student) => student._id);
    assert.ok(eligibleStudentIds.includes(eligibleStudent._id.toString()));
    assert.ok(!eligibleStudentIds.includes(nonMcaStudent._id.toString()));
    assert.ok(!eligibleStudentIds.includes(ineligibleStudent._id.toString()));

    const addCandidate = await request(`${electionsPath}/${election._id}/candidates`, {
      method: "POST",
      cookie: adminCookie,
      body: { studentId: eligibleStudent._id.toString(), manifesto: "A sample candidate manifesto." },
    });
    assert.equal(addCandidate.status, 201);
    assert.equal((await addCandidate.json()).studentId.enrollmentNo, enrollmentNumbers.eligible);

    const duplicateCandidate = await request(`${electionsPath}/${election._id}/candidates`, {
      method: "POST",
      cookie: adminCookie,
      body: { studentId: eligibleStudent._id.toString(), manifesto: "Duplicate entry" },
    });
    assert.equal(duplicateCandidate.status, 409);

    const activate = await request(`${electionsPath}/${election._id}/activate`, {
      method: "POST",
      cookie: adminCookie,
    });
    assert.equal(activate.status, 200);
    assert.equal((await activate.json()).status, "active");

    const editActive = await request(`${electionsPath}/${election._id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { title: "Cannot edit after activation" },
    });
    assert.equal(editActive.status, 409);

    const activeElection = await request("/api/elections/active", { cookie: studentCookie });
    assert.equal(activeElection.status, 200);
    assert.equal((await activeElection.json())._id, election._id);
    const activeCandidates = await request(`/api/elections/${election._id}/candidates`, {
      cookie: studentCookie,
    });
    assert.equal(activeCandidates.status, 200);
    assert.equal((await activeCandidates.json()).length, 1);
    assert.equal((await request("/api/elections/active")).status, 401);

    const end = await request(`${electionsPath}/${election._id}/end`, {
      method: "POST",
      cookie: adminCookie,
    });
    assert.equal(end.status, 200);
    assert.equal((await end.json()).status, "ended");
    assert.equal((await request("/api/elections/active", { cookie: studentCookie })).status, 404);
  } finally {
    if (server) {
      server.close();
      await once(server, "close");
    }
    if (election) {
      await Candidate.deleteMany({ electionId: election._id });
      await Election.deleteOne({ _id: election._id });
    }
    await VotingSession.deleteMany({ studentId: { $in: fixtureStudentIds } });
    await Student.deleteMany({ enrollmentNo: { $in: Object.values(enrollmentNumbers) } });
    if (admin) {
      await AdminSession.deleteMany({ adminId: admin._id });
      await Admin.deleteOne({ _id: admin._id });
    }
    await mongoose.disconnect();
  }
});