import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function Fines() {
  const { isTreasurer } = useAuth();
  const [members, setMembers] = useState([]);
  const [fines, setFines] = useState([]);
  const [form, setForm] = useState({ member: "", amount: "", reason: "" });
  const [message, setMessage] = useState(null);

  function loadFines() {
    client.get("/fines/").then((res) => setFines(res.data));
  }

  useEffect(() => {
    client.get("/members/").then((res) => setMembers(res.data));
    loadFines();
  }, []);

  async function recordFine(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await client.post("/fines/", form);
      setMessage({ type: "success", text: "Fine recorded." });
      setForm({ member: form.member, amount: "", reason: "" });
      loadFines();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.[0] || "Could not record fine." });
    }
  }

  async function markPaid(id) {
    setMessage(null);
    try {
      await client.post(`/fines/${id}/mark_paid/`);
      loadFines();
    } catch (err) {
      // Errors raised as a plain DRF ValidationError arrive as a list
      // (["message"]), not {detail: "message"} -- check both shapes.
      const text = err.response?.data?.[0] || err.response?.data?.detail || "Could not mark as paid.";
      setMessage({ type: "error", text });
    }
  }

  function memberName(id) {
    return members.find((m) => m.id === id)?.full_name || `#${id}`;
  }

  return (
    <div>
      <h1 className="page-title">Fines</h1>
      <p className="page-sub">Record fines against members and mark them as paid once collected.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {!isTreasurer && <ReadOnlyNotice />}

      {isTreasurer && (
      <div className="ledger-card" style={{ backgroundImage: "none" }}>
        <h2 className="card-heading">Record a fine</h2>
        <form onSubmit={recordFine}>
          <div className="field">
            <label>Member</label>
            <select value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })} required>
              <option value="">Select a member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Amount (MK)</label>
            <input type="number" step="0.01" min="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="field">
            <label>Reason</label>
            <input type="text" value={form.reason} placeholder="e.g. Late to meeting"
              onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <button className="btn btn-brass" type="submit">Record fine</button>
        </form>
      </div>
      )}

      <div className="ledger-card">
        <h2 className="card-heading">Fines record</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fines.map((f) => (
              <tr key={f.id}>
                <td>{memberName(f.member)}</td>
                <td className="amount">MK {Number(f.amount).toLocaleString()}</td>
                <td>{f.reason}</td>
                <td>
                  <span className={`stamp ${f.paid ? "stamp-sage" : "stamp-rust"}`}>
                    {f.paid ? "Paid" : "Unpaid"}
                  </span>
                </td>
                <td>
                  {!f.paid && isTreasurer && (
                    <button className="btn" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => markPaid(f.id)}>
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {fines.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--ink-soft)" }}>No fines recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
