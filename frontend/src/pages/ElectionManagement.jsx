import { useEffect, useState } from "react";
import api from "../api/client.js";

const localDateTime = (date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const newElection = () => {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    startTime: localDateTime(start),
    endTime: localDateTime(end),
    status: "draft",
  };
};

const formatDate = (value) => new Date(value).toLocaleString();

export default function ElectionManagement() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(newElection);
  const [managingId, setManagingId] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateStudentId, setCandidateStudentId] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadElections = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/elections");
      setElections(data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load elections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadElections();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(newElection());
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const openEdit = (election) => {
    setEditingId(election._id);
    setForm({
      title: election.title,
      description: election.description || "",
      startTime: localDateTime(new Date(election.startTime)),
      endTime: localDateTime(new Date(election.endTime)),
      status: election.status,
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const saveElection = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    };
    try {
      if (editingId) {
        await api.patch(`/admin/elections/${editingId}`, body);
        setNotice("Election details updated.");
      } else {
        await api.post("/admin/elections", body);
        setNotice("Election created.");
      }
      setFormOpen(false);
      await loadElections();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save election.");
    } finally {
      setSaving(false);
    }
  };

  const transitionElection = async (election, action) => {
    setError("");
    setNotice("");
    try {
      await api.post(`/admin/elections/${election._id}/${action}`);
      setNotice(action === "activate" ? "Election activated." : "Election ended.");
      await loadElections();
      if (managingId === election._id && action === "activate") setManagingId(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${action} election.`);
    }
  };

  const manageCandidates = async (election) => {
    setManagingId(election._id);
    setCandidateStudentId("");
    setManifesto("");
    setError("");
    try {
      const [studentsResponse, candidatesResponse] = await Promise.all([
        api.get(`/admin/elections/${election._id}/eligible-students`),
        api.get(`/admin/elections/${election._id}/candidates`),
      ]);
      setEligibleStudents(studentsResponse.data);
      setCandidates(candidatesResponse.data.candidates);
    } catch (requestError) {
      setManagingId(null);
      setError(requestError.response?.data?.message || "Unable to load candidate records.");
    }
  };

  const addCandidate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/admin/elections/${managingId}/candidates`, {
        studentId: candidateStudentId,
        manifesto,
      });
      setCandidates((current) => [...current, data]);
      setEligibleStudents((current) => current.filter((student) => student._id !== candidateStudentId));
      setCandidateStudentId("");
      setManifesto("");
      setNotice("Candidate added to this election.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to add candidate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-workspace">
      <div className="management-heading">
        <div>
          <p className="eyebrow">Administration / Elections</p>
          <h1>Election management</h1>
          <p className="lead">Create and schedule elections, then choose candidates from eligible MCA student records.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreate}>Create election</button>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}

      {formOpen && (
        <form className="panel student-form" onSubmit={saveElection}>
          <h2>{editingId ? "Edit election" : "Create election"}</h2>
          <div className="student-form-grid">
            <label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>Start time<input type="datetime-local" required value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label>End time<input type="datetime-local" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
            {!editingId && (
              <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select></label>
            )}
          </div>
          <div className="otp-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save election"}</button>
            <button className="btn btn-secondary" type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="panel" role="status">Loading elections...</p> : elections.length === 0 ? (
        <p className="panel muted">No elections have been created.</p>
      ) : (
        <div className="election-admin-list">
          {elections.map((election) => {
            const canActivate = election.status === "scheduled" && new Date(election.startTime) <= new Date() && new Date(election.endTime) > new Date();
            const canManageCandidates = ["draft", "scheduled"].includes(election.status);
            return (
              <article className="election-admin-card" key={election._id}>
                <div className="election-admin-heading">
                  <div><p className="eyebrow">Election</p><h2>{election.title}</h2><p className="muted">{election.description || "No description"}</p></div>
                  <span className={`election-status status-${election.status}`}>{election.status}</span>
                </div>
                <div className="election-admin-dates"><span>Starts {formatDate(election.startTime)}</span><span>Ends {formatDate(election.endTime)}</span></div>
                <div className="row-actions">
                  {canManageCandidates && <button className="text-button" type="button" onClick={() => manageCandidates(election)}>Manage candidates</button>}
                  {canManageCandidates && <button className="text-button" type="button" onClick={() => openEdit(election)}>Edit</button>}
                  {election.status === "scheduled" && <button className="btn btn-primary" type="button" disabled={!canActivate} title={!canActivate ? "Activation is available during the election date window." : undefined} onClick={() => transitionElection(election, "activate")}>Activate</button>}
                  {election.status === "active" && <button className="btn btn-secondary" type="button" onClick={() => transitionElection(election, "end")}>End election</button>}
                </div>
                {managingId === election._id && (
                  <div className="candidate-manager">
                    <h3>Election candidates</h3>
                    {candidates.length ? <ul className="candidate-roster">{candidates.map((candidate) => <li key={candidate._id}><strong>{candidate.studentId?.name}</strong><span>{candidate.studentId?.enrollmentNo} · {candidate.manifesto || "No manifesto"}</span></li>)}</ul> : <p className="muted">No candidates selected.</p>}
                    <form className="candidate-pick-form" onSubmit={addCandidate}>
                      <label>Eligible MCA student<select required value={candidateStudentId} onChange={(event) => setCandidateStudentId(event.target.value)}><option value="">Choose a student</option>{eligibleStudents.map((student) => <option key={student._id} value={student._id}>{student.enrollmentNo} · {student.name} · semester {student.semester}</option>)}</select></label>
                      <label>Manifesto<input value={manifesto} onChange={(event) => setManifesto(event.target.value)} /></label>
                      <button className="btn btn-primary" type="submit" disabled={saving || !eligibleStudents.length}>{saving ? "Adding..." : "Add candidate"}</button>
                    </form>
                    {!eligibleStudents.length && <p className="muted">No additional eligible MCA students are available.</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}