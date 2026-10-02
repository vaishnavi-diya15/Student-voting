import { Link, useOutletContext } from "react-router-dom";

export default function AdminDashboard() {
  const { admin } = useOutletContext();

  return (
    <section className="admin-workspace">
      <p className="eyebrow">Administration</p>
      <h1>Admin dashboard</h1>
      <p className="lead">Signed in as {admin.username || admin.email}.</p>
      <div className="admin-summary-grid">
        <article className="admin-summary">
          <p className="eyebrow">Student registry</p>
          <h2>Manage student records</h2>
          <p>Review enrollment, eligibility, and recorded voting status.</p>
          <Link className="btn btn-primary" to="/admin/students">Open student management</Link>
        </article>
        <article className="admin-summary">
          <p className="eyebrow">Election setup</p>
          <h2>Manage elections and candidates</h2>
          <p>Set election dates and status, and choose candidates from eligible student records.</p>
          <Link className="btn btn-secondary" to="/admin/elections">Open election management</Link>
        </article>
      </div>
    </section>
  );
}