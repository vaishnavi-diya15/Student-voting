import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";

export default function CandidateList() {
  const [searchParams] = useSearchParams();
  const electionId = searchParams.get("electionId") || "";
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(`/elections/${electionId}/candidates`)
      .then(({ data }) => {
        if (active) setCandidates(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load candidates.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [electionId]);

  if (loading) return <section className="panel" role="status">Loading candidates...</section>;
  if (error) return <p className="notice notice-error" role="alert">{error}</p>;

  return (
    <section>
      <p className="eyebrow">Candidate list</p>
      <h1>Meet the candidates</h1>
      <p className="lead">Review the candidates registered for this election.</p>
      {candidates.length === 0 && <p className="panel muted">No candidates are registered yet.</p>}
      <div className="candidate-grid">
        {candidates.map((candidate) => (
          <article className="candidate-card" key={candidate._id}>
            <div className="candidate-avatar" aria-hidden="true">{candidate.studentId?.name?.slice(0, 1) || "?"}</div>
            <p className="eyebrow">MCA student</p>
            <h2>{candidate.studentId?.name || "Candidate details unavailable"}</h2>
            <p>{candidate.manifesto || "No manifesto provided."}</p>
            <Link
              className="btn btn-secondary"
              to={`/vote/confirm?electionId=${encodeURIComponent(electionId)}&candidateId=${candidate._id}`}
              state={{ candidateName: candidate.studentId?.name, manifesto: candidate.manifesto }}
            >
              Review selection
            </Link>
          </article>
        ))}
      </div>
      <Link className="text-link" to="/election">Back to election details</Link>
    </section>
  );
}