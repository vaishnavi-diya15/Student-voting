import { Link } from "react-router-dom";

export default function SessionExpired() {
  return (
    <section className="form-page">
      <h1>Session expired</h1>
      <p className="lead">Your verification session has ended. Start verification again to continue.</p>
      <Link className="btn btn-primary" to="/verify">
        Start verification again
      </Link>
    </section>
  );
}