import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client.js";

export default function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const enrollmentNo = location.state?.enrollmentNo;
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState(location.state?.expiresAt || null);
  const [resendAt, setResendAt] = useState(
    location.state?.resendAfterSeconds
      ? Date.now() + location.state.resendAfterSeconds * 1000
      : null
  );
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(location.state?.message || "");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    if (!enrollmentNo) navigate("/verify", { replace: true });
  }, [enrollmentNo, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsRemaining = (timestamp) =>
    timestamp ? Math.max(0, Math.ceil((new Date(timestamp).getTime() - now) / 1000)) : 0;

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setMessage("Enter the 6-digit OTP.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await api.post("/students/verify-otp", { enrollmentNo, otp });
      navigate("/dashboard", { replace: true, state: { message: response.data.message } });
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to verify OTP. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.post("/students/send-otp", { enrollmentNo });
      setExpiresAt(response.data.expiresAt);
      setResendAt(Date.now() + response.data.resendAfterSeconds * 1000);
      setMessage(response.data.message);
      setMessageType("success");
      setOtp("");
    } catch (error) {
      const retryAfterSeconds = error.response?.data?.retryAfterSeconds;
      if (retryAfterSeconds) setResendAt(Date.now() + retryAfterSeconds * 1000);
      setMessage(error.response?.data?.message || "Unable to resend OTP. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  if (!enrollmentNo) return null;

  return (
    <section className="form-page">
      <p className="eyebrow">Email verification</p>
      <h1>Enter your OTP</h1>
      <p className="lead">Enter the code sent to the email registered with your enrollment.</p>
      <form className="card form" onSubmit={handleVerify} noValidate>
        <label htmlFor="otp">6-digit OTP</label>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={otp}
          onChange={(event) => {
            setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
            setMessage("");
          }}
          required
        />
        <p className="otp-expiry" aria-live="polite">
          {secondsRemaining(expiresAt) > 0
            ? `OTP expires in ${Math.floor(secondsRemaining(expiresAt) / 60)}:${String(
                secondsRemaining(expiresAt) % 60
              ).padStart(2, "0")}`
            : "OTP expired. Request a new one."}
        </p>
        <div className="otp-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Checking..." : "Verify OTP"}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={loading || secondsRemaining(resendAt) > 0}
            onClick={handleResend}
          >
            {secondsRemaining(resendAt) > 0 ? `Resend in ${secondsRemaining(resendAt)}s` : "Resend OTP"}
          </button>
        </div>
      </form>
      {message && (
        <p className={`notice notice-${messageType}`} role={messageType === "error" ? "alert" : "status"}>
          {message}
        </p>
      )}
    </section>
  );
}