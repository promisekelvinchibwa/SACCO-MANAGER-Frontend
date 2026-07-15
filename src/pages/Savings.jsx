import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function Savings() {
  const { isTreasurer } = useAuth();
  const { cycles } = useCycles();
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [transactions, setTransactions] = useState([]);
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

  // For a member this returns their own contributions; for the treasurer it
  // returns everyone's, which is why the balance card below is member-only.
  useEffect(() => {
    client.get("/savings-transactions/").then((res) => setTransactions(res.data));
  }, []);

  const shareTotal = transactions
    .filter((t) => t.txn_type === "share_purchase")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const socialFundTotal = transactions
    .filter((t) => t.txn_type === "social_fund")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const bookBalance = shareTotal + socialFundTotal;

  const todayStr = new Date().toISOString().slice(0, 10);
  const sortedMeetings = meetings.slice().sort((a, b) => (a.meeting_date < b.meeting_date ? -1 : 1));
  const nextMeeting = sortedMeetings.find((m) => m.meeting_date >= todayStr);
  const pastMeetings = sortedMeetings.filter((m) => m.meeting_date < todayStr).reverse();

  // For a member, group their own transactions by meeting so each past
  // meeting shows what they actually bought/contributed that day.
  const txnsByMeeting = transactions.reduce((acc, t) => {
    (acc[t.meeting] = acc[t.meeting] || []).push(t);
    return acc;
  }, {});

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
      {!isTreasurer && <ReadOnlyNotice />}

      <div className="stat-row">
        {!isTreasurer && (
          <>
            <div className="stat-box">
              <div className="stat-label">Next meeting</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {nextMeeting ? nextMeeting.meeting_date : "\u2014"}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">My book balance</div>
              <div className="stat-value">MK {bookBalance.toLocaleString()}</div>
            </div>
          </>
        )}
        <div className="stat-box">
          <div className="stat-label">Group fund balance</div>
          <div className="stat-value">
            {openCycle ? `MK ${Number(openCycle.fund_balance).toLocaleString()}` : "\u2014"}
          </div>
        </div>
      </div>

      {!isTreasurer && (
        <div className="ledger-card">
          <h2 className="card-heading">My savings history</h2>
          {pastMeetings.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>No past meetings yet this cycle.</p>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Meeting date</th>
                  <th>Shares purchased</th>
                  <th>Social fund</th>
                  <th>Total that day</th>
                </tr>
              </thead>
              <tbody>
                {pastMeetings.map((m) => {
                  const txns = txnsByMeeting[m.id] || [];
                  const shares = txns
                    .filter((t) => t.txn_type === "share_purchase")
                    .reduce((sum, t) => sum + Number(t.amount), 0);
                  const social = txns
                    .filter((t) => t.txn_type === "social_fund")
                    .reduce((sum, t) => sum + Number(t.amount), 0);
                  if (txns.length === 0) return null;
                  return (
                    <tr key={m.id}>
                      <td>{m.meeting_date}</td>
                      <td className="amount">MK {shares.toLocaleString()}</td>
                      <td className="amount">MK {social.toLocaleString()}</td>
                      <td className="amount">MK {(shares + social).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isTreasurer && (
        <div className="ledger-card">
          <h2 className="card-heading">Meeting schedule</h2>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {sortedMeetings.map((m) => (
                <tr key={m.id}>
                  <td>{m.meeting_date}</td>
                </tr>
              ))}
              {meetings.length === 0 && (
                <tr><td style={{ color: "var(--ink-soft)" }}>No meetings scheduled for the open cycle yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isTreasurer && (
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
      )}

      {isTreasurer && (
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
      )}
    </div>
  );
}