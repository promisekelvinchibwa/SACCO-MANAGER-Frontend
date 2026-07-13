import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";

export default function Savings() {
  const { cycles } = useCycles();
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [form, setForm] = useState({ member: "", meeting: "", txn_type: "share_purchase", amount: "" });
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [message, setMessage] = useState(null);

  const openCycle = cycles.find((c) => c.status === "open");

  useEffect(() => {
    client.get("/members/").then((res) => setMembers(res.data));
  }, []);

  useEffect(() => {
    if (!openCycle) return;
    client.get("/meetings/").then((res) =>
      setMeetings(res.data.filter((m) => m.cycle === openCycle.id))
    );
  }, [openCycle]);

  async function createMeeting(e) {
    e.preventDefault();
    if (!openCycle || !newMeetingDate) return;
    try {
      const res = await client.post("/meetings/", { cycle: openCycle.id, meeting_date: newMeetingDate });
      setMeetings((prev) => [...prev, res.data]);
      setNewMeetingDate("");
      setMessage({ type: "success", text: "Meeting created." });
    } catch {
      setMessage({ type: "error", text: "Could not create meeting." });
    }
  }

  async function recordTxn(e) {
    e.preventDefault();
    setMessage(null);
    try {
      await client.post("/savings-transactions/", {
        member: form.member,
        meeting: form.meeting,
        txn_type: form.txn_type,
        amount: form.amount,
      });
      setMessage({ type: "success", text: "Transaction recorded." });
      setForm({ ...form, amount: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.[0] || "Could not record transaction." });
    }
  }

  return (
    <div>
      <h1 className="page-title">Meetings &amp; savings</h1>
      <p className="page-sub">Record share purchases and social fund contributions per meeting.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="ledger-card">
        <h2 className="card-heading">Create a meeting</h2>
        <form onSubmit={createMeeting} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Meeting date</label>
            <input type="date" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={!openCycle}>Add meeting</button>
        </form>
      </div>

      <div className="ledger-card">
        <h2 className="card-heading">Record a transaction</h2>
        <form onSubmit={recordTxn}>
          <div className="field">
            <label>Member</label>
            <select value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })} required>
              <option value="">Select a member\u2026</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Meeting</label>
            <select value={form.meeting} onChange={(e) => setForm({ ...form, meeting: e.target.value })} required>
              <option value="">Select a meeting\u2026</option>
              {meetings.map((m) => <option key={m.id} value={m.id}>{m.meeting_date}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.txn_type} onChange={(e) => setForm({ ...form, txn_type: e.target.value })}>
              <option value="share_purchase">Share purchase</option>
              <option value="social_fund">Social fund contribution</option>
            </select>
          </div>
          <div className="field">
            <label>Amount (MK)</label>
            <input type="number" step="0.01" min="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <button className="btn btn-brass" type="submit">Record transaction</button>
        </form>
      </div>
    </div>
  );
}
