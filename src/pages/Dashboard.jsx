import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { role } = useAuth();
  const { cycles, loading: cyclesLoading } = useCycles();
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [balance, setBalance] = useState(null);
  const [groupBalance, setGroupBalance] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([client.get("/members/"), client.get("/loans/"), client.get("/me/balance/"), client.get("/me/group-balance/")])
      .then(([m, l, b, g]) => {
        setMembers(Array.isArray(m.data) ? m.data : m.data?.results ?? []);
        setLoans(Array.isArray(l.data) ? l.data : l.data?.results ?? []);
        setBalance(b.data);
        setGroupBalance(g.data);
      })
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  const openCycle = cycles.find((c) => c.status === "open");

  // Next meeting date, shared with every member of the group right on
  // their first landing page -- rather than only visible to someone who
  // specifically goes looking on the Meetings & savings page.
  useEffect(() => {
    if (!openCycle) return;
    client.get("/meetings/").then((res) =>
      setMeetings(res.data.filter((m) => m.cycle === openCycle.id))
    );
  }, [openCycle]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextMeeting = meetings
    .filter((m) => m.meeting_date >= todayStr)
    .sort((a, b) => (a.meeting_date < b.meeting_date ? -1 : 1))[0];

  const activeLoans = openCycle
    ? loans.filter((l) => l.status === "active" && l.cycle === openCycle.id)
    : [];
  const isMember = role === "member";

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Community SACCO Manager &mdash; current cycle overview</p>

      {error && <div className="alert alert-error">{error}</div>}

      {/* A member's own book balance -- their personal savings, never
          the group's, shown separately from the group-wide numbers
          below so the two are never confused with one another. */}
      {isMember && balance && (
        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-label">Your savings</div>
            <div className="stat-value">
              {balance.personal_savings != null ? `MK ${Number(balance.personal_savings).toLocaleString()}` : "\u2014"}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Your outstanding loans</div>
            <div className="stat-value">
              {openCycle && balance.personal_outstanding_loans != null
                ? `MK ${Number(balance.personal_outstanding_loans).toLocaleString()}`
                : "\u2014"}
            </div>
          </div>
        </div>
      )}

      <div className="stat-row">
        <div className="stat-box">
          <div className="stat-label">Group total saved</div>
          <div className="stat-value">
            {balance ? `MK ${Number(balance.group_total_saved).toLocaleString()}` : "\u2026"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Available fund balance</div>
          <div className="stat-value">
            {groupBalance ? `MK ${Number(groupBalance.fund_balance).toLocaleString()}` : "\u2014"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Social fund reserve</div>
          <div className="stat-value">
            {groupBalance ? `MK ${Number(groupBalance.social_fund_balance).toLocaleString()}` : "\u2014"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Lendable balance</div>
          <div className="stat-value">
            {groupBalance ? `MK ${Number(groupBalance.lendable_balance).toLocaleString()}` : "\u2014"}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Next meeting</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {nextMeeting ? nextMeeting.meeting_date : "\u2014"}
          </div>
        </div>
        {!isMember && (
          <div className="stat-box">
            <div className="stat-label">Members</div>
            <div className="stat-value">{members.length}</div>
          </div>
        )}
        {!isMember && (
          <div className="stat-box">
            <div className="stat-label">Active loans</div>
            <div className="stat-value">{activeLoans.length}</div>
          </div>
        )}
        <div className="stat-box">
          <div className="stat-label">Cycle status</div>
          <div className="stat-value" style={{ fontSize: 15 }}>
            {openCycle ? <span className="stamp stamp-sage">Open</span> : <span className="stamp stamp-rust">None open</span>}
          </div>
        </div>
      </div>

      {!isMember && (
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
      )}
    </div>
  );
}
