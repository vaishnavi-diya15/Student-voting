import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

export default function VoteConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const candidate = location.state?.candidateName
    ? { name: location.state.candidateName, manifesto: location.state.manifesto }
    : null;
  const electionId = searchParams.get("electionId") || "";

  if (!candidate) {
    return (
      <section className="panel">
        <h1>No candidate selected</h1>
        <Link className="btn btn-primary" to={`/candidates?electionId=${encodeURIComponent(electionId)}`}>
          Return to candidates
        </Link>
      </section>
    );
  }

  return (
    <section className="form-page">
      <p className="eyebrow">Review</p>
      <h1>Confirm your selection</h1>
      <div className="panel confirmation-summary">
        <p className="muted">Selected candidate</p>
        <h2>{candidate.name}</h2>
        <p>{candidate.manifesto || "No manifesto provided."}</p>
      </div>
      <p className="demo-callout">Demonstration only. Continuing will not submit or record a vote.</p>
      <div className="otp-actions">
        <Link className="btn btn-secondary" to={`/candidates?electionId=${encodeURIComponent(electionId)}`}>
          Change selection
        </Link>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate("/vote/success", { state: { candidateName: candidate.name } })}
        >
          Confirm demonstration
        </button>
      </div>
    </section>
  );
}