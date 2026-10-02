import { useEffect, useState } from "react";
import api from "../api/client.js";

const emptyStudent = {
  enrollmentNo: "",
  name: "",
  email: "",
  mobile: "",
  course: "MCA",
  semester: "3",
  eligible: true,
};

const formatDate = (value) => new Date(value).toLocaleDateString();

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/students");
      setStudents(data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...emptyStudent });
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = (student) => {
    setEditingId(student._id);
    setForm({
      enrollmentNo: student.enrollmentNo,
      name: student.name,
      email: student.email,
      mobile: student.mobile || "",
      course: student.course,
      semester: String(student.semester),
      eligible: student.eligible,
    });
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const student = { ...form, semester: Number(form.semester) };
    try {
      if (editingId) {
        await api.patch(`/admin/students/${editingId}`, student);
        setNotice("Student record updated.");
      } else {
        await api.post("/admin/students", student);
        setNotice("Student added to the registry.");
      }
      setFormOpen(false);
      await loadStudents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save student record.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEligibility = async (student) => {
    setError("");
    setNotice("");
    try {
      await api.patch(`/admin/students/${student._id}`, { eligible: !student.eligible });
      setNotice(`${student.enrollmentNo} eligibility updated.`);
      await loadStudents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update eligibility.");
    }
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Delete student ${student.enrollmentNo}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/students/${student._id}`);
      setNotice(`${student.enrollmentNo} was deleted.`);
      await loadStudents();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete student.");
    }
  };

  return (
    <section className="admin-workspace">
      <div className="management-heading">
        <div>
          <p className="eyebrow">Administration / Students</p>
          <h1>Student management</h1>
          <p className="lead">Manage enrollment records and eligibility. Voting status is read-only.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={startAdd}>Add student</button>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}

      {formOpen && (
        <form className="panel student-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit student" : "Add student"}</h2>
          <div className="student-form-grid">
            <label>Enrollment number<input required value={form.enrollmentNo} onChange={(event) => setForm({ ...form, enrollmentNo: event.target.value })} /></label>
            <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Mobile<input type="tel" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} /></label>
            <label>Course<input required value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} /></label>
            <label>Semester<input type="number" min="1" step="1" required value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} /></label>
          </div>
          <label className="eligibility-check"><input type="checkbox" checked={form.eligible} onChange={(event) => setForm({ ...form, eligible: event.target.checked })} /> Eligible to vote</label>
          <div className="otp-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save student"}</button>
            <button className="btn btn-secondary" type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      <div className="registry-toolbar"><span>{students.length} student{students.length === 1 ? "" : "s"}</span><button className="text-button" type="button" onClick={loadStudents} disabled={loading}>Refresh</button></div>
      {loading ? (
        <p className="panel" role="status">Loading student records...</p>
      ) : students.length === 0 ? (
        <p className="panel muted">No students found.</p>
      ) : (
        <div className="table-scroll">
          <table className="student-table">
            <thead><tr><th>Student</th><th>Enrollment</th><th>Course</th><th>Eligible</th><th>Has voted</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td><strong>{student.name}</strong><span>{student.email}</span></td>
                  <td>{student.enrollmentNo}</td>
                  <td>{student.course}, semester {student.semester}</td>
                  <td><span className={`record-badge ${student.eligible ? "record-yes" : "record-no"}`}>{student.eligible ? "Eligible" : "Ineligible"}</span></td>
                  <td>{student.hasVoted ? "Yes" : "No"}</td>
                  <td>{formatDate(student.createdAt)}</td>
                  <td><div className="row-actions"><button className="text-button" type="button" onClick={() => startEdit(student)}>Edit</button><button className="text-button" type="button" onClick={() => toggleEligibility(student)}>{student.eligible ? "Mark ineligible" : "Mark eligible"}</button><button className="text-button text-danger" type="button" onClick={() => deleteStudent(student)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}