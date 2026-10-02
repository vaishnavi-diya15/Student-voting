import { useState } from "react";
import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import api from "../api/client.js";

export default function AdminLayout() {
  const { admin } = useOutletContext();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const linkClass = ({ isActive }) => (isActive ? "admin-nav-link active" : "admin-nav-link");

  const logout = async () => {
    setLoggingOut(true);
    setError("");
    try {
      await api.post("/admin/auth/logout");
      navigate("/admin/login", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to log out. Please retry.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="eyebrow">Student voting</p>
          <h2>Administration</h2>
        </div>
        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          <NavLink to="/admin/dashboard" end className={linkClass}>Overview</NavLink>
          <NavLink to="/admin/students" className={linkClass}>Students</NavLink>
          <NavLink to="/admin/elections" className={linkClass}>Elections</NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <span>{admin.username || admin.email}</span>
          <button className="text-button" type="button" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      </aside>
      <div className="admin-content">
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <Outlet context={{ admin }} />
      </div>
    </div>
  );
}