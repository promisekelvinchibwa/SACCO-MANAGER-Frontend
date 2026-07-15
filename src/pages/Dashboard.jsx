import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";

export default function Dashboard() {
  const { cycles, loading: cyclesLoading } = useCycles();
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([client.get("/members/"), client.get("/loans/")])
      .then(([m, l]) => {
        // Handle both a plain array response and DRF-style pagination
        // ({ count, next, previous, results }).
        setMembers(Array.isArray(m.data) ? m.data : m.data?.results ?? []);
        setLoans(Array.isArray(l.data) ? l.data : l.data?.results ?? []);
      })
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  const openCycle = cycles.find((c) => c.status === "open");
  const activeLoans = loans.filter((l) => l.status === "active");

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Chikondi Savings Group &mdash; current cycle overview</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-row">
        <div className="stat-box">
          <div className="stat-label">Fund balance</div>
          <div className="stat-value">
            {cyclesLoading ? "\u2026" : openCycle ? `MK ${Number(openCycle.fund_balance).toLocaleString()}` : "\u2014"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Members</div>
          <div className="stat-value">{members.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Active loans</div>
          <div className="stat-value">{activeLoans.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Cycle status</div>
          <div className="stat-value" style={{ fontSize: 15 }}>
            {openCycle ? <span className="stamp stamp-sage">Open</span> : <span className="stamp stamp-rust">None open</span>}
          </div>
        </div>
      </div>

      <div className="ledger-card">
        <h2 className="card-heading">Members</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>National ID</th>
              <th>Joined</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.full_name}</td>
                <td className="amount">{m.national_id}</td>
                <td>{m.join_date}</td>
                <td className="amount">{m.phone || "\u2014"}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={4} style={{ color: "var(--ink-soft)" }}>No members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
