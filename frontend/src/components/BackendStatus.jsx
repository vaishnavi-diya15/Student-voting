import { useEffect, useState } from "react";
import { getHealth } from "../api/client.js";

const DB_LABELS = {
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Not connected",
  disconnecting: "Disconnecting",
  not_configured: "MONGO_URI not set",
  unknown: "Unknown",
};

export default function BackendStatus() {
  const [state, setState] = useState({ loading: true, data: null, error: false });

  useEffect(() => {
    let active = true;
    getHealth()
      .then((data) => active && setState({ loading: false, data, error: false }))
      .catch(() => active && setState({ loading: false, data: null, error: true }));
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return <p className="status-note">Checking the backend...</p>;
  }

  if (state.error) {
    return (
      <div className="status status-bad" role="status">
        <strong>Backend not reachable.</strong>
        <span>Start it with <code>npm run dev</code> in the backend folder.</span>
      </div>
    );
  }

  const dbOk = state.data.database === "connected";

  return (
    <dl className="status" role="status">
      <div>
        <dt>API</dt>
        <dd className="ok">Online</dd>
      </div>
      <div>
        <dt>MongoDB</dt>
        <dd className={dbOk ? "ok" : "warn"}>
          {DB_LABELS[state.data.database] || state.data.database}
        </dd>
      </div>
    </dl>
  );
}
