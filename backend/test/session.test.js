require("dotenv").config();

const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const test = require("node:test");
const app = require("../server");
const Student = require("../models/Student");
const VotingSession = require("../models/VotingSession");
const { createVotingSession, hashSessionToken, SESSION_TTL_MS } = require("../utils/votingSession");

test("voting session expires server-side, survives refresh, and is destroyed on logout", async (context) => {
  if (!process.env.MONGO_URI) {
    context.skip("Set MONGO_URI to run MongoDB integration checks");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "student_voting",
    serverSelectionTimeoutMS: 5000,
  });

  const suffix = randomUUID();
  const enrollmentNo = `MCA-SESSION-${suffix}`;
  let server;
  let student;

  try {
    await Student.init();
    await VotingSession.init();
    student = await Student.create({
      enrollmentNo,
      name: "Session Test Student",
      email: `session.${suffix}@example.test`,
      course: "MCA",
      semester: 3,
    });

    server = app.listen(0);
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const protectedRequest = (cookie) =>
      fetch(`${baseUrl}/api/session/test`, {
        headers: cookie ? { Cookie: cookie } : {},
      });

    const noSession = await protectedRequest();
    assert.equal(noSession.status, 401);
    assert.equal((await noSession.json()).code, "SESSION_REQUIRED");

    const firstSession = await createVotingSession(student._id);
    const firstCookie = `voting_session=${firstSession.token}`;
    assert.ok(firstSession.expiresAt.getTime() - Date.now() <= SESSION_TTL_MS);
    assert.ok(firstSession.expiresAt.getTime() - Date.now() > SESSION_TTL_MS - 5000);

    const storedSession = await VotingSession.findOne({ studentId: student._id }).select("+tokenHash");
    assert.equal(storedSession.authenticated, true);
    assert.equal(storedSession.tokenHash, hashSessionToken(firstSession.token));
    assert.notEqual(storedSession.tokenHash, firstSession.token);
    assert.deepEqual(Object.keys(storedSession.toObject()).sort(), [
      "_id",
      "authenticated",
      "createdAt",
      "expiresAt",
      "studentId",
      "tokenHash",
      "__v",
    ].sort());

    const validSession = await protectedRequest(firstCookie);
    assert.equal(validSession.status, 200);
    const validBody = await validSession.json();
    assert.equal(validBody.authenticated, true);
    assert.equal(validBody.expiresAt, firstSession.expiresAt.toISOString());

    const refreshedSession = await protectedRequest(firstCookie);
    assert.equal(refreshedSession.status, 200);
    assert.equal((await refreshedSession.json()).expiresAt, validBody.expiresAt);

    await VotingSession.updateOne(
      { studentId: student._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    const expiredSession = await protectedRequest(firstCookie);
    assert.equal(expiredSession.status, 401);
    assert.equal((await expiredSession.json()).code, "SESSION_EXPIRED");
    assert.equal(await VotingSession.findOne({ studentId: student._id }), null);

    const logoutSession = await createVotingSession(student._id);
    const logoutCookie = `voting_session=${logoutSession.token}`;
    const logout = await fetch(`${baseUrl}/api/session/logout`, {
      method: "POST",
      headers: { Cookie: logoutCookie },
    });
    assert.equal(logout.status, 200);
    assert.equal(await VotingSession.findOne({ studentId: student._id }), null);
    assert.equal((await protectedRequest(logoutCookie)).status, 401);
  } finally {
    if (server) {
      server.close();
      await once(server, "close");
    }
    if (student) {
      await VotingSession.deleteMany({ studentId: student._id });
      await Student.deleteOne({ _id: student._id });
    }
    await mongoose.disconnect();
  }
});