import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";

const formatDate = (value) => new Date(value).toLocaleString();

export default function ElectionDetails() {
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get("/elections/active")
      .then(({ data }) => {
        if (active) setElection(data);
      })
      .catch(() => {
        if (active) setError("There is no active election available right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <section className="panel" role="status">Loading election details...</section>;
  if (error) return <p className="notice notice-error" role="alert">{error}</p>;
  if (!election) {
    return (
      <section className="panel">
        <h1>No election available</h1>
        <p className="muted">Election details will appear here when an election is published.</p>
      </section>
    );
  }

  return (
    <section className="election-page">
      <p className="eyebrow">Election details</p>
      <h1>{election.title}</h1>
      <p className="lead">{election.description || "No additional election information is available."}</p>
      <dl className="election-facts panel">
        <div><dt>Status</dt><dd><span className={`election-status status-${election.status}`}>{election.status}</span></dd></div>
        <div><dt>Opens</dt><dd>{formatDate(election.startTime)}</dd></div>
        <div><dt>Closes</dt><dd>{formatDate(election.endTime)}</dd></div>
      </dl>
      <p className="demo-callout">Candidate information is available below. Voting transactions are not part of this phase.</p>
      <Link className="btn btn-primary" to={`/candidates?electionId=${encodeURIComponent(election._id)}`}>
        View candidates
      </Link>
    </section>
  );
}