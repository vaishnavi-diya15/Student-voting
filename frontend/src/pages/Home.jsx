import { Link } from "react-router-dom";
import BackendStatus from "../components/BackendStatus.jsx";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>Student elections, clearly presented.</h1>
          <p className="lead">
            A guided student verification flow with clear election information and
            candidate details for the MCA project demonstration.
          </p>
          <div className="actions">
            <Link to="/verify" className="btn btn-primary">
              Verify as a student
            </Link>
          </div>
        </div>

        <div className="ballot" aria-hidden="true">
          <div className="ballot-title">Sample ballot</div>
          <div className="ballot-row">
            <span className="box box-checked">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="line line-long" />
          </div>
          <div className="ballot-row">
            <span className="box" />
            <span className="line line-mid" />
          </div>
          <div className="ballot-row">
            <span className="box" />
            <span className="line line-short" />
          </div>
          <div className="ballot-foot">Student election preview</div>
        </div>
      </section>

      <section className="panel">
        <h2>System status</h2>
        <BackendStatus />
      </section>

      <section className="panel">
        <h2>How voting will work</h2>
        <ol className="steps">
          <li>
            <strong>Verify.</strong> The student proves they are on the voter list.
          </li>
          <li><strong>Review.</strong> Read election and candidate information.</li>
          <li><strong>Confirm.</strong> Candidate selection is a non-submitting UI demonstration.</li>
        </ol>
        <p className="muted">No vote is submitted or recorded in this phase.</p>
      </section>
    </>
  );
}
