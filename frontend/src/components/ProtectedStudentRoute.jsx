import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../api/client.js";

export default function ProtectedStudentRoute() {
  const location = useLocation();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: "checking", expiresAt: null });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    setState({ status: "checking", expiresAt: null });
    api
      .get("/session/test")
      .then(({ data }) => {
        if (!active) return;
        const expiresAt = new Date(data.expiresAt).getTime();
        setState(expiresAt > Date.now() ? { status: "valid", expiresAt } : { status: "expired" });
        setNow(Date.now());
      })
      .catch((error) => {
        if (!active) return;
        setState(
          error.response?.status === 401
            ? { status: "expired" }
            : { status: "error", message: "Unable to check your session. Check your connection and retry." }
        );
      });

    return () => {
      active = false;
    };
  }, [location.pathname, retry]);

  useEffect(() => {
    if (state.status !== "valid") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.status]);

  if (state.status === "checking") {
    return <section className="panel" role="status">Checking student session...</section>;
  }
  if (state.status === "expired") return <Navigate to="/session-expired" replace />;
  if (state.status === "error") {
    return (
      <section className="panel" role="alert">
        <p className="notice notice-error">{state.message}</p>
        <button className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>
          Retry session check
        </button>
      </section>
    );
  }
  if (state.expiresAt <= now) return <Navigate to="/session-expired" replace />;

  return <Outlet context={{ expiresAt: state.expiresAt }} />;
}