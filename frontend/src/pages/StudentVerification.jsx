import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";

export default function StudentVerification() {
  const navigate = useNavigate();
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setEnrollmentNo(event.target.value);
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEnrollmentNo = enrollmentNo.trim();

    if (!normalizedEnrollmentNo) {
      setMessage("Enrollment number is required.");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      await api.post("/students/verify", { enrollmentNo: normalizedEnrollmentNo });
      const response = await api.post("/students/send-otp", { enrollmentNo: normalizedEnrollmentNo });
      navigate("/verify/otp", {
        replace: true,
        state: {
          enrollmentNo: normalizedEnrollmentNo,
          expiresAt: response.data.expiresAt,
          resendAfterSeconds: response.data.resendAfterSeconds,
          message: response.data.message,
        },
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to verify enrollment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="form-page">
      <h1>Student verification</h1>
      <p className="lead">Verify your MCA enrollment and registered email address.</p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="enrollmentNo">Enrollment number</label>
          <input
            id="enrollmentNo"
            name="enrollmentNo"
            type="text"
            autoComplete="off"
            value={enrollmentNo}
            onChange={handleChange}
            required
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Verifying..." : "Verify and send OTP"}
          </button>
      </form>
      {message && <p className="notice notice-error" role="alert">{message}</p>}
    </section>
  );
}
