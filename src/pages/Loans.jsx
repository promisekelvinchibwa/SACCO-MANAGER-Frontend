import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";

export default function Loans() {
  const { cycles } = useCycles();
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [issueForm, setIssueForm] = useState({ member: "", amount: "" });
  const [repayAmounts, setRepayAmounts] = useState({});
  const [message, setMessage] = useState(null);

  const openCycle = cycles.find((c) => c.status === "open");

  function loadLoans() {
    client.get("/loans/").then((res) => setLoans(res.data));
  }

  useEffect(() => {
    client.get("/members/").then((res) => setMembers(res.data));
    loadLoans();
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
      });
      setMessage({ type: "success", text: "Loan issued." });
      setIssueForm({ member: "", amount: "" });
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

  function memberName(id) {
    return members.find((m) => m.id === id)?.full_name || `#${id}`;
  }

  return (
    <div>
      <h1 className="page-title">Loans</h1>
      <p className="page-sub">Issue loans within the borrowing limit and fund balance, and record repayments.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="ledger-card">
        <h2 className="card-heading">Issue a loan</h2>
        <form onSubmit={issueLoan} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Member</label>
            <select value={issueForm.member} onChange={(e) => setIssueForm({ ...issueForm, member: e.target.value })} required>
              <option value="">Select a member\u2026</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Amount (MK)</label>
            <input type="number" step="0.01" min="0.01" value={issueForm.amount}
              onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })} required />
          </div>
          <button className="btn btn-brass" type="submit" disabled={!openCycle}>Issue loan</button>
        </form>
      </div>

      <div className="ledger-card">
        <h2 className="card-heading">Loan ledger</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Principal</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Record repayment</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id}>
                <td>{memberName(l.member)}</td>
                <td className="amount">MK {Number(l.principal).toLocaleString()}</td>
                <td className="amount">MK {Number(l.outstanding_total).toLocaleString()}</td>
                <td>
                  <span className={`stamp ${l.status === "repaid" ? "stamp-sage" : l.status === "defaulted" ? "stamp-rust" : "stamp-brass"}`}>
                    {l.status}
                  </span>
                </td>
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
              </tr>
            ))}
            {loans.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--ink-soft)" }}>No loans yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
