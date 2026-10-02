import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/auth/login", form);
      navigate(location.state?.from || "/admin/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="form-page">
      <h1>Admin login</h1>
      <p className="lead">Sign in to manage student enrollment and eligibility.</p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="login">Username or email</label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          value={form.login}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

      </form>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
    </section>
  );
}
