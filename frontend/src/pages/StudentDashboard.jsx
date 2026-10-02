import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import api from "../api/client.js";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { expiresAt } = useOutletContext();
  const [now, setNow] = useState(Date.now());
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (expiresAt && expiresAt <= now) {
      navigate("/session-expired", { replace: true });
    }
  }, [expiresAt, navigate, now]);

  const remainingSeconds = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api.post("/session/logout");
      navigate("/verify", { replace: true });
    } catch {
      setLogoutError("Could not end the session. Check your connection and try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <section className="form-page">
      <h1>Student dashboard</h1>
      <p className="lead">Your email verification is complete.</p>
      {location.state?.message && <p className="notice notice-success">{location.state.message}</p>}
      <p className="session-countdown" role="timer" aria-live="polite">
        Session expires in {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
      </p>
      <p className="muted">Your verified session is active. Review the current election details.</p>
      <Link className="btn btn-primary" to="/election">View election</Link>
      {logoutError && <p className="notice notice-error" role="alert">{logoutError}</p>}
      <button className="btn btn-secondary" type="button" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "Signing out..." : "Log out"}
      </button>
    </section>
  );
}