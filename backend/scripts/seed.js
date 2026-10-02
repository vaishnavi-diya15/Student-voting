require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Election = require("../models/Election");
const Student = require("../models/Student");

const students = [
  {
    enrollmentNo: "MCA2025-001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.test",
    course: "MCA",
    semester: 3,
    eligible: true,
  },
  {
    enrollmentNo: "MCA2025-002",
    name: "Isha Verma",
    email: "isha.verma@example.test",
    course: "MCA",
    semester: 3,
    eligible: true,
  },
  {
    enrollmentNo: "MCA2025-003",
    name: "Kabir Patel",
    email: "kabir.patel@example.test",
    course: "MCA",
    semester: 3,
    eligible: true,
  },
  {
    enrollmentNo: "MCA2025-004",
    name: "Mira Nair",
    email: "mira.nair@example.test",
    course: "MCA",
    semester: 3,
    eligible: false,
  },
];

const seed = async () => {
  if (!(await connectDB())) throw new Error("Could not connect to MongoDB");

  for (const student of students) {
    await Student.updateOne(
      { enrollmentNo: student.enrollmentNo },
      { $set: student },
      { upsert: true, runValidators: true }
    );
  }

  const startTime = new Date("2027-01-15T09:00:00.000Z");
  const endTime = new Date("2027-01-15T15:00:00.000Z");
  await Election.updateOne(
    { title: "MCA Student Council Practice Election" },
    {
      $set: {
        title: "MCA Student Council Practice Election",
        description: "Development-only sample election record.",
        startTime,
        endTime,
        status: "scheduled",
      },
    },
    { upsert: true, runValidators: true }
  );

  console.log(`[seed] Upserted ${students.length} sample students and one election.`);
};

seed()
  .catch((error) => {
    console.error(`[seed] Failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });