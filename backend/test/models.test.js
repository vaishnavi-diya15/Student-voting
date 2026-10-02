require("dotenv").config();

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const test = require("node:test");
const Admin = require("../models/Admin");
const Candidate = require("../models/Candidate");
const Election = require("../models/Election");
const Student = require("../models/Student");
const Vote = require("../models/Vote");

test("database models validate fields and references", async (context) => {
  if (!process.env.MONGO_URI) {
    context.skip("Set MONGO_URI to run MongoDB integration checks");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "student_voting",
    serverSelectionTimeoutMS: 5000,
  });

  const suffix = randomUUID();
  const enrollmentNo = `MCA-TEST-${suffix}`;
  const title = `Model test election ${suffix}`;
  let student;
  let election;
  let candidate;

  try {
    const missingStudent = new Student({});
    assert.ok(missingStudent.validateSync().errors.enrollmentNo);
    assert.ok(missingStudent.validateSync().errors.name);
    assert.ok(missingStudent.validateSync().errors.email);
    assert.ok(missingStudent.validateSync().errors.course);
    assert.ok(missingStudent.validateSync().errors.semester);

    const invalidEmail = new Student({
      enrollmentNo,
      name: "Test Student",
      email: "not-an-email",
      course: "MCA",
      semester: 3,
    });
    assert.ok(invalidEmail.validateSync().errors.email);

    await Student.init();
    student = await Student.create({
      enrollmentNo,
      name: "Test Student",
      email: `test.${suffix}@example.test`,
      course: "MCA",
      semester: 3,
    });
    assert.equal(student.eligible, true);
    assert.equal(student.hasVoted, false);

    await assert.rejects(
      Student.create({
        enrollmentNo,
        name: "Duplicate Student",
        email: `duplicate.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
      }),
      (error) => error.code === 11000
    );

    election = await Election.create({
      title,
      startTime: new Date("2027-02-01T09:00:00.000Z"),
      endTime: new Date("2027-02-01T15:00:00.000Z"),
      status: "scheduled",
    });
    assert.equal(election.status, "scheduled");

    candidate = await Candidate.create({
      electionId: election._id,
      studentId: student._id,
      manifesto: "Development fixture",
    });
    assert.equal(Candidate.schema.path("studentId").options.ref, "Student");
    assert.equal(Candidate.schema.path("electionId").options.ref, "Election");

    await assert.rejects(
      Candidate.create({
        electionId: election._id,
        studentId: new mongoose.Types.ObjectId(),
      }),
      (error) => error.name === "ValidationError"
    );
    await assert.rejects(
      Candidate.create({
        electionId: new mongoose.Types.ObjectId(),
        studentId: student._id,
      }),
      (error) => error.name === "ValidationError"
    );

    await Vote.create({ electionId: election._id, candidateId: candidate._id });
    assert.equal(Vote.schema.path("electionId").options.ref, "Election");
    assert.equal(Vote.schema.path("candidateId").options.ref, "Candidate");
    await assert.rejects(
      Vote.create({
        electionId: election._id,
        candidateId: new mongoose.Types.ObjectId(),
      }),
      (error) => error.name === "ValidationError"
    );
    await assert.rejects(
      Vote.create({
        electionId: new mongoose.Types.ObjectId(),
        candidateId: candidate._id,
      }),
      (error) => error.name === "ValidationError"
    );

    const adminWithoutIdentity = new Admin({ passwordHash: "hashed-test-value" });
    await assert.rejects(
      adminWithoutIdentity.validate(),
      (error) => error.name === "ValidationError"
    );
    const adminWithoutHash = new Admin({ username: "test-admin" });
    assert.ok(adminWithoutHash.validateSync().errors.passwordHash);
  } finally {
    if (election) {
      await Vote.deleteMany({ electionId: election._id });
      await Candidate.deleteMany({ electionId: election._id });
      await Election.deleteOne({ _id: election._id });
    }
    if (student) await Student.deleteOne({ _id: student._id });
    await mongoose.disconnect();
  }
});