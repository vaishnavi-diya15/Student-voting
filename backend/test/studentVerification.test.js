require("dotenv").config();

const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const test = require("node:test");
const app = require("../server");
const Student = require("../models/Student");

test("POST /api/students/verify checks enrollment eligibility", async (context) => {
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
    valid: `MCA-VERIFY-${suffix}-1`,
    nonMca: `MCA-VERIFY-${suffix}-2`,
    ineligible: `MCA-VERIFY-${suffix}-3`,
    voted: `MCA-VERIFY-${suffix}-4`,
  };
  let server;

  try {
    await Student.create([
      {
        enrollmentNo: enrollmentNumbers.valid,
        name: "Verification Test Student",
        email: `verify.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
      },
      {
        enrollmentNo: enrollmentNumbers.nonMca,
        name: "Non MCA Test Student",
        email: `nonmca.${suffix}@example.test`,
        course: "BCA",
        semester: 3,
      },
      {
        enrollmentNo: enrollmentNumbers.ineligible,
        name: "Ineligible Test Student",
        email: `ineligible.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
        eligible: false,
      },
      {
        enrollmentNo: enrollmentNumbers.voted,
        name: "Voted Test Student",
        email: `voted.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
        hasVoted: true,
      },
    ]);

    server = app.listen(0);
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const verify = (enrollmentNo) =>
      fetch(`${baseUrl}/api/students/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentNo }),
      });

    const validResponse = await verify(enrollmentNumbers.valid);
    assert.equal(validResponse.status, 200);
    assert.deepEqual(await validResponse.json(), {
      verified: true,
      message: "Student verified. Continue to OTP verification.",
    });

    const missingResponse = await verify(`MISSING-${suffix}`);
    assert.equal(missingResponse.status, 404);
    assert.equal((await missingResponse.json()).message, "Student enrollment number was not found.");

    const nonMcaResponse = await verify(enrollmentNumbers.nonMca);
    assert.equal(nonMcaResponse.status, 403);
    assert.equal((await nonMcaResponse.json()).message, "Only MCA students can verify for this election.");

    const ineligibleResponse = await verify(enrollmentNumbers.ineligible);
    assert.equal(ineligibleResponse.status, 403);
    assert.equal((await ineligibleResponse.json()).message, "This student is not eligible to vote.");

    const votedResponse = await verify(enrollmentNumbers.voted);
    assert.equal(votedResponse.status, 403);
    assert.equal((await votedResponse.json()).message, "Voting is already completed for this student.");

    const emptyResponse = await verify("   ");
    assert.equal(emptyResponse.status, 400);
    assert.equal((await emptyResponse.json()).message, "Enrollment number is required.");
  } finally {
    if (server) {
      server.close();
      await once(server, "close");
    }
    await Student.deleteMany({ enrollmentNo: { $in: Object.values(enrollmentNumbers) } });
    await mongoose.disconnect();
  }
});