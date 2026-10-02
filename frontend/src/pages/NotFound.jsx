import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="form-page">
      <h1>Page not found</h1>
      <p className="lead">That address does not exist in this app.</p>
      <Link to="/" className="btn btn-primary">
        Go to home
      </Link>
    </section>
  );
}
