import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/admin-summary/")
      .then((res) => setSummary(res.data))
      .catch(() => setError("Could not load admin summary."));
  }, []);

  const groups = summary?.groups ?? [];
  const treasurers = summary?.treasurers ?? [];

  return (
    <div>
      <h1 className="page-title">Admin dashboard</h1>
      <p className="page-sub">Community SACCO Manager &mdash; platform overview</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-row">
        <div className="stat-box">
          <div className="stat-label">Groups</div>
          <div className="stat-value">{summary ? summary.group_count : "\u2026"}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Treasurers</div>
          <div className="stat-value">{summary ? treasurers.length : "\u2026"}</div>
        </div>
      </div>

      <div className="ledger-card">
        <h2 className="card-heading">Treasurers</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Group</th>
            </tr>
          </thead>
          <tbody>
            {treasurers.map((t) => (
              <tr key={t.id}>
                <td>{t.full_name}</td>
                <td className="amount">{t.phone || "\u2014"}</td>
                <td>{t.group_name || "\u2014"}</td>
              </tr>
            ))}
            {treasurers.length === 0 && (
              <tr><td colSpan={3} style={{ color: "var(--ink-soft)" }}>No treasurers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ledger-card">
        <h2 className="card-heading">Groups</h2>
        <table className="ledger-table">
          <thead>
            <tr><th>Name</th></tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}><td>{g.name}</td></tr>
            ))}
            {groups.length === 0 && (
              <tr><td style={{ color: "var(--ink-soft)" }}>No groups yet.</td></tr>
            )}
          </tbody>
        </table>
        <Link to="/onboard-group" className="btn btn-brass" style={{ marginTop: 16, display: "inline-block" }}>
          Onboard a new group
        </Link>
      </div>
    </div>
  );
}
