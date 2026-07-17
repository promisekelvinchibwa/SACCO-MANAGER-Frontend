import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function Loans() {
  const { isTreasurer } = useAuth();
  const { cycles } = useCycles();
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [issueForm, setIssueForm] = useState({ member: "", amount: "", duration_weeks: "2" });
  const [repayAmounts, setRepayAmounts] = useState({});
  const [message, setMessage] = useState(null);

  const openCycle = cycles.find((c) => c.status === "open");

  const visibleLoans = openCycle
    ? loans
        .filter((l) => l.cycle === openCycle.id)
        .slice()
        .sort((a, b) => {
          const priority = (s) => (s === "defaulted" ? 0 : s === "active" ? 1 : 2);
          const pa = priority(a.status);
          const pb = priority(b.status);
          if (pa !== pb) return pa - pb;
          return Number(b.outstanding_total || 0) - Number(a.outstanding_total || 0);
        })
    : [];

  function loadLoans() {
    client.get("/loans/").then((res) => setLoans(res.data));
  }

  function loadNotifications() {
    client.get("/loan-notifications/").then((res) => setNotifications(res.data));
  }

  useEffect(() => {
    client.get("/members/").then((res) => setMembers(res.data));
    loadLoans();
    loadNotifications();
  }, []);

  async function issueLoan(e) {
    e.preventDefault();
    setMessage(null);
    if (!openCycle) return;
    try {
      await client.post("/loans/issue/", {
        member: issueForm.member,
        cycle: openCycle.id,
        amount: issueForm.amount,
        duration_weeks: parseInt(issueForm.duration_weeks, 10),
      });
      setMessage({ type: "success", text: "Loan issued." });
      setIssueForm({ member: "", amount: "", duration_weeks: "2" });
      loadLoans();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.[0] || "Could not issue loan." });
    }
  }

  async function repay(loanId) {
    const amount = repayAmounts[loanId];
    if (!amount) return;
    setMessage(null);
    try {
      await client.post(`/loans/${loanId}/repay/`, { amount });
      setMessage({ type: "success", text: "Repayment recorded." });
      setRepayAmounts({ ...repayAmounts, [loanId]: "" });
      loadLoans();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.[0] || "Could not record repayment." });
    }
  }

  async function processDueLoans() {
    setMessage(null);
    try {
      const res = await client.post("/loans/process_due/");
      setMessage({ type: "success", text: `Processed ${res.data.count} due loan(s).` });
      loadLoans();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not process due loans." });
    }
  }

  async function markNotificationRead(id) {
    await client.post(`/loan-notifications/${id}/mark_read/`);
    setNotifications(notifications.filter((n) => n.id !== id));
  }

  function memberName(id) {
    return members.find((m) => m.id === id)?.full_name || `#${id}`;
  }

  function formatRate(rate) {
    return `${(Number(rate) * 100).toFixed(0)}%`;
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <div>
      <h1 className="page-title">Loans</h1>
      <p className="page-sub">Issue loans within the borrowing limit and fund balance, and record repayments.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {!isTreasurer && <ReadOnlyNotice />}

      {unreadNotifications.length > 0 && (
        <div className="ledger-card" style={{ marginBottom: 16 }}>
          <h2 className="card-heading">Notifications ({unreadNotifications.length})</h2>
          {unreadNotifications.map((n) => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <strong>{n.notification_type}:</strong> {n.message}
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => markNotificationRead(n.id)}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      {isTreasurer && (
        <div className="ledger-card" style={{ backgroundImage: "none", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="card-heading" style={{ margin: 0 }}>Issue a loan</h2>
            <button className="btn" style={{ padding: "6px 14px", fontSize: 13 }} onClick={processDueLoans} disabled={!openCycle}>
              Process due loans
            </button>
          </div>
          <form onSubmit={issueLoan} style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Member</label>
              <select value={issueForm.member} onChange={(e) => setIssueForm({ ...issueForm, member: e.target.value })} required>
                <option value="">Select a member</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Amount (MK)</label>
              <input type="number" step="0.01" min="0.01" value={issueForm.amount}
                onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Duration</label>
              <select value={issueForm.duration_weeks} onChange={(e) => setIssueForm({ ...issueForm, duration_weeks: e.target.value })}>
                <option value="1">1 week (15%)</option>
                <option value="2">2 weeks (15%)</option>
                <option value="3">3 weeks (20%)</option>
                <option value="4">4 weeks (20%)</option>
              </select>
            </div>
            <button className="btn btn-brass" type="submit" disabled={!openCycle}>Issue loan</button>
          </form>
        </div>
      )}

      <div className="ledger-card">
        <h2 className="card-heading">Loan ledger</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Principal</th>
              <th>Rate</th>
              <th>Outstanding</th>
              <th>Due date</th>
              <th>Extensions</th>
              <th>Status</th>
              {isTreasurer && <th>Record repayment</th>}
            </tr>
          </thead>
          <tbody>
            {visibleLoans.map((l) => (
              <tr key={l.id}>
                <td>{memberName(l.member)}</td>
                <td className="amount">MK {Number(l.principal).toLocaleString()}</td>
                <td>{formatRate(l.interest_rate)}</td>
                <td className="amount">MK {Number(l.outstanding_total).toLocaleString()}</td>
                <td>{l.due_date || "—"}</td>
                <td>{l.extension_count}</td>
                <td>
                  <span className={`stamp ${l.status === "repaid" ? "stamp-sage" : l.status === "defaulted" ? "stamp-rust" : "stamp-brass"}`}>
                    {l.status}
                  </span>
                </td>
                {isTreasurer && (
                <td>
                  {l.status === "active" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number" step="0.01" min="0.01" placeholder="Amount"
                        style={{ width: 100, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6 }}
                        value={repayAmounts[l.id] || ""}
                        onChange={(e) => setRepayAmounts({ ...repayAmounts, [l.id]: e.target.value })}
                      />
                      <button className="btn" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => repay(l.id)}>
                        Pay
                      </button>
                    </div>
                  ) : "\u2014"}
                </td>
                )}
              </tr>
            ))}
            {visibleLoans.length === 0 && (
              <tr>
                <td colSpan={isTreasurer ? 8 : 7} style={{ color: "var(--ink-soft)" }}>
                  {openCycle ? "No loans for the current open cycle." : "No open cycle — loan ledger is empty."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
