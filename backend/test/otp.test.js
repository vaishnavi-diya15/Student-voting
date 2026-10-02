require("dotenv").config();

const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const test = require("node:test");
const app = require("../server");
const emailService = require("../utils/emailService");
const OtpChallenge = require("../models/OtpChallenge");
const Student = require("../models/Student");
const VotingSession = require("../models/VotingSession");
const { hashSessionToken, SESSION_TTL_MS } = require("../utils/votingSession");

test("OTP endpoints send, resend, expire, and verify registered-student codes", async (context) => {
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
    valid: `MCA-OTP-${suffix}-1`,
    expired: `MCA-OTP-${suffix}-2`,
    voted: `MCA-OTP-${suffix}-3`,
  };
  const registeredEmail = `otp.${suffix}@example.test`;
  const sentEmails = [];
  const originalSendOtpEmail = emailService.sendOtpEmail;
  let server;

  try {
    await Student.init();
    await OtpChallenge.init();
    await Student.create([
      {
        enrollmentNo: enrollmentNumbers.valid,
        name: "OTP Test Student",
        email: registeredEmail,
        course: "MCA",
        semester: 3,
      },
      {
        enrollmentNo: enrollmentNumbers.expired,
        name: "Expired OTP Test Student",
        email: `expired.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
      },
      {
        enrollmentNo: enrollmentNumbers.voted,
        name: "Already Voted OTP Test Student",
        email: `voted.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
        hasVoted: true,
      },
    ]);

    emailService.sendOtpEmail = async (email) => sentEmails.push(email);
    server = app.listen(0);
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const post = (endpoint, body) =>
      fetch(`${baseUrl}/api/students/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    const invalidStudent = await post("send-otp", { enrollmentNo: `MISSING-${suffix}` });
    assert.equal(invalidStudent.status, 404);
    const invalidOtpStudent = await post("verify-otp", {
      enrollmentNo: `MISSING-${suffix}`,
      otp: "123456",
    });
    assert.equal(invalidOtpStudent.status, 404);

    const sendResponse = await post("send-otp", { enrollmentNo: enrollmentNumbers.valid });
    assert.equal(sendResponse.status, 200);
    const sendBody = await sendResponse.json();
    assert.equal(sendBody.expiresInSeconds > 0, true);
    assert.equal(sendBody.resendAfterSeconds, 30);
    assert.equal(sentEmails[0].to, registeredEmail);
    assert.match(sentEmails[0].otp, /^\d{6}$/);

    const validStudent = await Student.findOne({ enrollmentNo: enrollmentNumbers.valid }).select("_id");
    const challenge = await OtpChallenge.findOne({ studentId: validStudent._id }).select("+otpHash");
    assert.ok(challenge);
    assert.notEqual(challenge.otpHash, sentEmails[0].otp);
    const firstOtp = sentEmails[0].otp;

    const wrongOtp = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.valid,
      otp: firstOtp === "000000" ? "000001" : "000000",
    });
    assert.equal(wrongOtp.status, 400);
    assert.equal((await OtpChallenge.findById(challenge._id)).attempts, 1);

    const validOtp = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.valid,
      otp: firstOtp,
    });
    assert.equal(validOtp.status, 200);
    const validOtpBody = await validOtp.json();
    assert.equal(validOtpBody.verified, true);
    assert.ok(new Date(validOtpBody.sessionExpiresAt).getTime() - Date.now() <= SESSION_TTL_MS);
    assert.ok(new Date(validOtpBody.sessionExpiresAt).getTime() - Date.now() > SESSION_TTL_MS - 5000);
    const setCookie = validOtp.headers.get("set-cookie");
    assert.match(setCookie, /voting_session=[^;]+/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    const sessionToken = setCookie.match(/voting_session=([^;]+)/)[1];
    const verifiedStudent = await Student.findOne({ enrollmentNo: enrollmentNumbers.valid });
    const votingSession = await VotingSession.findOne({ studentId: verifiedStudent._id }).select("+tokenHash");
    assert.equal(votingSession.tokenHash, hashSessionToken(sessionToken));
    assert.equal(verifiedStudent.hasVoted, false);
    const protectedAfterOtp = await fetch(`${baseUrl}/api/session/test`, {
      headers: { Cookie: `voting_session=${sessionToken}` },
    });
    assert.equal(protectedAfterOtp.status, 200);

    const consumedChallenge = await OtpChallenge.findById(challenge._id).select("+otpHash");
    assert.ok(consumedChallenge.consumedAt);
    assert.equal(consumedChallenge.otpHash, undefined);

    const immediateResend = await post("send-otp", {
      enrollmentNo: enrollmentNumbers.valid,
    });
    assert.equal(immediateResend.status, 429);
    await OtpChallenge.updateOne(
      { studentId: validStudent._id },
      { $set: { sentAt: new Date(Date.now() - 31_000) } }
    );

    const firstResendChallenge = await post("send-otp", {
      enrollmentNo: enrollmentNumbers.valid,
    });
    assert.equal(firstResendChallenge.status, 200);
    const firstResend = sentEmails.at(-1).otp;
    await OtpChallenge.updateOne(
      { studentId: validStudent._id },
      { $set: { sentAt: new Date(Date.now() - 31_000) } }
    );
    const resent = await post("send-otp", { enrollmentNo: enrollmentNumbers.valid });
    assert.equal(resent.status, 200);
    assert.equal(sentEmails.at(-1).to, registeredEmail);
    assert.notEqual(sentEmails.at(-1).otp, firstResend);
    const oldOtp = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.valid,
      otp: firstResend,
    });
    assert.equal(oldOtp.status, 400);

    const wrongCurrentOtp = sentEmails.at(-1).otp === "000000" ? "000001" : "000000";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const wrongAttempt = await post("verify-otp", {
        enrollmentNo: enrollmentNumbers.valid,
        otp: wrongCurrentOtp,
      });
      assert.equal(wrongAttempt.status, 400);
    }
    const lockedAttempt = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.valid,
      otp: wrongCurrentOtp,
    });
    assert.equal(lockedAttempt.status, 429);

    const throttledResend = await post("send-otp", {
      enrollmentNo: enrollmentNumbers.valid,
    });
    assert.equal(throttledResend.status, 429);
    await OtpChallenge.updateOne(
      { studentId: validStudent._id },
      { $set: { sentAt: new Date(Date.now() - 31_000) } }
    );
    const resendAfterCooldown = await post("send-otp", {
      enrollmentNo: enrollmentNumbers.valid,
    });
    assert.equal(resendAfterCooldown.status, 200);
    const newestOtp = sentEmails.at(-1).otp;
    const verifiedAfterResend = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.valid,
      otp: newestOtp,
    });
    assert.equal(verifiedAfterResend.status, 200);

    const expiredSend = await post("send-otp", { enrollmentNo: enrollmentNumbers.expired });
    assert.equal(expiredSend.status, 200);
    const expiredStudent = await Student.findOne({ enrollmentNo: enrollmentNumbers.expired });
    await OtpChallenge.updateOne(
      { studentId: expiredStudent._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    const expiredOtp = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.expired,
      otp: sentEmails.at(-1).otp,
    });
    assert.equal(expiredOtp.status, 410);

    const votedSend = await post("send-otp", { enrollmentNo: enrollmentNumbers.voted });
    assert.equal(votedSend.status, 403);
    const votedVerify = await post("verify-otp", {
      enrollmentNo: enrollmentNumbers.voted,
      otp: "123456",
    });
    assert.equal(votedVerify.status, 403);
  } finally {
    emailService.sendOtpEmail = originalSendOtpEmail;
    if (server) {
      server.close();
      await once(server, "close");
    }
    const students = await Student.find({
      enrollmentNo: { $in: Object.values(enrollmentNumbers) },
    }).select("_id");
    await OtpChallenge.deleteMany({ studentId: { $in: students.map((student) => student._id) } });
    await VotingSession.deleteMany({ studentId: { $in: students.map((student) => student._id) } });
    await Student.deleteMany({ enrollmentNo: { $in: Object.values(enrollmentNumbers) } });
    await mongoose.disconnect();
  }
});