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
  const [issueForm, setIssueForm] = useState({ member: "", amount: "" });
  const [repayAmounts, setRepayAmounts] = useState({});
  const [message, setMessage] = useState(null);

  const openCycle = cycles.find((c) => c.status === "open");

  // Show only loans for the current open cycle. When there's no open
  // cycle the ledger should be empty.
  const visibleLoans = openCycle
    ? loans
        .filter((l) => l.cycle === openCycle.id)
        .slice()
        .sort((a, b) => {
          const priority = (s) => (s === "defaulted" ? 0 : s === "active" ? 1 : 2);
          const pa = priority(a.status);
          const pb = priority(b.status);
          if (pa !== pb) return pa - pb;
          // Within same status, show larger outstanding amounts first.
          return Number(b.outstanding_total || 0) - Number(a.outstanding_total || 0);
        })
    : [];

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
      {!isTreasurer && <ReadOnlyNotice />}

      {isTreasurer && (
      <div className="ledger-card" style={{ backgroundImage: "none" }}>
        <h2 className="card-heading">Issue a loan</h2>
        <form onSubmit={issueLoan} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
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
              <th>Outstanding</th>
              <th>Status</th>
              {isTreasurer && <th>Record repayment</th>}
            </tr>
          </thead>
          <tbody>
            {visibleLoans.map((l) => (
              <tr key={l.id}>
                <td>{memberName(l.member)}</td>
                <td className="amount">MK {Number(l.principal).toLocaleString()}</td>
                <td className="amount">MK {Number(l.outstanding_total).toLocaleString()}</td>
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
                <td colSpan={isTreasurer ? 5 : 4} style={{ color: "var(--ink-soft)" }}>
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
