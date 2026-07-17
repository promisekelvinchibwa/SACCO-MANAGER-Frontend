import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../utils/errors";
import { notifyCountsChanged } from "../utils/notify";

const STATUS_STYLE = {
  pending: { color: "#b8860b", label: "Pending" },
  approved: { color: "#2f7d4f", label: "Approved" },
  rejected: { color: "#b3261e", label: "Rejected" },
};

export default function LoanRequests() {
  const { isTreasurer } = useAuth();
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [duration_weeks, setDurationWeeks] = useState("2");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function loadRequests() {
    client.get("/loan-requests/").then((res) => setRequests(res.data));
  }

  useEffect(() => {
    loadRequests();
    if (isTreasurer) {
      client.get("/members/").then((res) => setMembers(res.data));
    }
  }, [isTreasurer]);

  function memberName(r) {
    return r.member_name || members.find((m) => m.id === r.member)?.full_name || `#${r.member}`;
  }

  async function submitRequest(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await client.post("/loan-requests/", { amount, reason, duration_weeks: parseInt(duration_weeks, 10) });
      setMessage({ type: "success", text: "Loan request submitted — waiting on the treasurer to review it." });
      setAmount("");
      setReason("");
      loadRequests();
      notifyCountsChanged();
    } catch (err) {
      setMessage({ type: "error", text: extractErrorMessage(err, "Could not submit loan request.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(id, action) {
    setMessage(null);
    setBusyId(id);
    try {
      await client.post(`/loan-requests/${id}/${action}/`);
      setMessage({
        type: "success",
        text: action === "approve" ? "Loan approved and disbursed." : "Request rejected.",
      });
      loadRequests();
      notifyCountsChanged();
    } catch (err) {
      setMessage({ type: "error", text: extractErrorMessage(err, `Could not ${action} this request.`) });
    } finally {
      setBusyId(null);
    }
  }

  async function withdraw(id) {
    setMessage(null);
    setBusyId(id);
    try {
      await client.delete(`/loan-requests/${id}/`);
      loadRequests();
      notifyCountsChanged();
    } catch (err) {
      setMessage({ type: "error", text: extractErrorMessage(err, "Could not withdraw this request.") });
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div>
      <h1 className="page-title">Loan requests</h1>
      <p className="page-sub">
        {isTreasurer
          ? "Review pending loan requests from members, and approve or reject them."
          : "Request a loan against your savings. Once approved, it's disbursed immediately."}
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {!isTreasurer && (
        <div className="ledger-card" style={{ backgroundImage: "none" }}>
          <h2 className="card-heading">Request a loan</h2>
          <form onSubmit={submitRequest}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Amount (MK)</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ padding: "8px 10px" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 220 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Duration</span>
                <select
                  value={duration_weeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  style={{ padding: "8px 10px" }}
                >
                  <option value="1">1 week (15% interest)</option>
                  <option value="2">2 weeks (15% interest)</option>
                  <option value="3">3 weeks (20% interest)</option>
                  <option value="4">4 weeks (20% interest)</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 220 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Reason (optional)</span>
                <input
                  type="text"
                  maxLength={255}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. School fees, business stock"
                  style={{ padding: "8px 10px" }}
                />
              </label>
            </div>
            <button className="btn btn-brass" type="submit" disabled={submitting || !amount}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </div>
      )}

      <div className="ledger-card" style={{ backgroundImage: "none" }}>
        <h2 className="card-heading">{isTreasurer ? "Pending requests" : "Your pending requests"}</h2>
        {pending.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>No pending requests.</p>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                {isTreasurer && <th>Member</th>}
                <th>Amount</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Requested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  {isTreasurer && <td>{memberName(r)}</td>}
                  <td className="amount">MK {Number(r.amount).toLocaleString()}</td>
                  <td>{r.duration_weeks} week{r.duration_weeks > 1 ? "s" : ""}</td>
                  <td>{r.reason || "—"}</td>
                  <td>{new Date(r.requested_at).toLocaleDateString()}</td>
                  <td>
                    {isTreasurer ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-brass"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, "approve")}
                        >
                          Approve
                        </button>
                        <button className="btn" disabled={busyId === r.id} onClick={() => decide(r.id, "reject")}> 
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button className="btn" disabled={busyId === r.id} onClick={() => withdraw(r.id)}>
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
