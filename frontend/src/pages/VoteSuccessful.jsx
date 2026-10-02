import { Link, useLocation } from "react-router-dom";

export default function VoteSuccessful() {
  const location = useLocation();
  const candidateName = location.state?.candidateName;

  return (
    <section className="form-page">
      <p className="eyebrow">Demonstration complete</p>
      <h1>Vote successful</h1>
      {candidateName && <p className="lead">Selected: {candidateName}</p>}
      <p className="notice notice-success" role="status">
        This was a UI demonstration only. No vote was submitted or recorded.
      </p>
      <Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link>
    </section>
  );
}