import { NavLink, Outlet, Link } from "react-router-dom";

export default function Layout() {
  const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <div className="app">
      <header className="site-header">
        <div className="container header-row">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="28" height="28">
                <rect width="32" height="32" rx="6" fill="currentColor" />
                <path
                  d="M8 17l6 6 11-13"
                  stroke="#fff"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Student Voting
          </Link>
          <nav aria-label="Main">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/verify" className={linkClass}>
              Student verification
            </NavLink>
            <NavLink to="/admin/login" className={linkClass}>Admin</NavLink>
          </nav>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">MCA Semester 3 project, Phase 8</div>
      </footer>
    </div>
  );
}
