import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api from "../api/client.js";

export default function ProtectedAdminRoute() {
  const location = useLocation();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: "checking" });

  useEffect(() => {
    let active = true;
    setState({ status: "checking" });
    api
      .get("/admin/auth/me")
      .then(({ data }) => {
        if (active) setState({ status: "authenticated", admin: data.admin });
      })
      .catch((error) => {
        if (!active) return;
        setState(
          error.response?.status === 401
            ? { status: "unauthenticated" }
            : { status: "error", message: "Unable to check admin access. Check your connection and retry." }
        );
      });
    return () => {
      active = false;
    };
  }, [location.pathname, retry]);

  if (state.status === "checking") return <section className="panel" role="status">Checking administrator access...</section>;
  if (state.status === "unauthenticated") return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (state.status === "error") {
    return (
      <section className="panel" role="alert">
        <p className="notice notice-error">{state.message}</p>
        <button className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>
          Retry access check
        </button>
      </section>
    );
  }

  return <Outlet context={{ admin: state.admin }} />;
}