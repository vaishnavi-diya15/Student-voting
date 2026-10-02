require("dotenv").config();

const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const test = require("node:test");
const app = require("../server");
const Admin = require("../models/Admin");
const AdminSession = require("../models/AdminSession");
const Student = require("../models/Student");

test("admin login, protected student management, and logout", async (context) => {
  if (!process.env.MONGO_URI) {
    context.skip("Set MONGO_URI to run MongoDB integration checks");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "student_voting",
    serverSelectionTimeoutMS: 5000,
  });

  const suffix = randomUUID();
  const username = `phase7-admin-${suffix}`;
  const email = `admin.${suffix}@example.test`;
  const password = `Phase7-Test-${suffix}-Secret`;
  const enrollmentNo = `MCA-ADMIN-TEST-${suffix}`;
  let admin;
  let server;

  try {
    await Admin.init();
    await AdminSession.init();
    const passwordHash = await bcrypt.hash(password, 4);
    admin = await Admin.create({ username, email, passwordHash });
    assert.notEqual(admin.passwordHash, password);
    assert.equal(await bcrypt.compare(password, admin.passwordHash), true);

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

    const protectedWithoutAuth = await request("/api/admin/students");
    assert.equal(protectedWithoutAuth.status, 401);

    const invalidLogin = await request("/api/admin/auth/login", {
      method: "POST",
      body: { login: username, password: "wrong-password" },
    });
    assert.equal(invalidLogin.status, 401);

    const login = await request("/api/admin/auth/login", {
      method: "POST",
      body: { login: username, password },
    });
    assert.equal(login.status, 200);
    const loginBody = await login.json();
    assert.equal(loginBody.authenticated, true);
    assert.equal(loginBody.admin.email, email);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /admin_session=[^;]+/);
    assert.match(cookie, /HttpOnly/i);

    const listStudents = await request("/api/admin/students", { cookie });
    assert.equal(listStudents.status, 200);
    assert.ok(Array.isArray(await listStudents.json()));

    const addStudent = await request("/api/admin/students", {
      method: "POST",
      cookie,
      body: {
        enrollmentNo,
        name: "Admin CRUD Test Student",
        email: `student.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
      },
    });
    assert.equal(addStudent.status, 201);
    const createdStudent = await addStudent.json();
    assert.equal(createdStudent.eligible, true);
    assert.equal(createdStudent.hasVoted, false);

    const duplicateStudent = await request("/api/admin/students", {
      method: "POST",
      cookie,
      body: {
        enrollmentNo,
        name: "Duplicate Student",
        email: `duplicate.${suffix}@example.test`,
        course: "MCA",
        semester: 3,
      },
    });
    assert.equal(duplicateStudent.status, 409);

    const invalidStudent = await request("/api/admin/students", {
      method: "POST",
      cookie,
      body: {
        enrollmentNo: `${enrollmentNo}-invalid`,
        name: "Invalid Student",
        email: "invalid-email",
        course: "MCA",
        semester: 3.5,
      },
    });
    assert.equal(invalidStudent.status, 400);

    const updateStudent = await request(`/api/admin/students/${createdStudent._id}`, {
      method: "PATCH",
      cookie,
      body: { eligible: false, hasVoted: true, semester: 4 },
    });
    assert.equal(updateStudent.status, 200);
    const updatedStudent = await updateStudent.json();
    assert.equal(updatedStudent.eligible, false);
    assert.equal(updatedStudent.hasVoted, false);
    assert.equal(updatedStudent.semester, 4);

    const deleteStudent = await request(`/api/admin/students/${createdStudent._id}`, {
      method: "DELETE",
      cookie,
    });
    assert.equal(deleteStudent.status, 204);
    assert.equal(await Student.findById(createdStudent._id), null);

    const logout = await request("/api/admin/auth/logout", { method: "POST", cookie });
    assert.equal(logout.status, 200);
    const protectedAfterLogout = await request("/api/admin/students", { cookie });
    assert.equal(protectedAfterLogout.status, 401);
  } finally {
    if (server) {
      server.close();
      await once(server, "close");
    }
    if (admin) {
      await AdminSession.deleteMany({ adminId: admin._id });
      await Admin.deleteOne({ _id: admin._id });
    }
    await Student.deleteMany({ enrollmentNo: { $in: [enrollmentNo, `${enrollmentNo}-invalid`] } });
    await mongoose.disconnect();
  }
});