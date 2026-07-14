import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function Cycles() {
  const { isTreasurer } = useAuth();
  const { cycles, loading, reload } = useCycles();
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ group: "", start_date: "", end_date: "" });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isTreasurer) {
      client.get("/groups/").then((res) => {
        setGroups(res.data);
        // Auto-select when there's only one group, matching the Members page pattern.
        if (res.data.length === 1) {
          setForm((f) => ({ ...f, group: res.data[0].id }));
        }
      });
    }
  }, [isTreasurer]);

  const groupHasOpenCycle = (groupId) =>
    cycles.some((c) => String(c.group) === String(groupId) && c.status === "open");

  const selectedGroupBlocked = form.group && groupHasOpenCycle(form.group);

  async function startCycle(e) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await client.post("/cycles/", { ...form, status: "open" });
      setMessage({ type: "success", text: "Cycle started." });
      setForm({ ...form, start_date: "", end_date: "" });
      reload();
    } catch (err) {
      const data = err.response?.data;
      const text =
        data?.non_field_errors?.[0] ||
        data?.detail ||
        data?.start_date?.[0] ||
        data?.end_date?.[0] ||
        "Could not start cycle.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  }

  function groupName(id) {
    return groups.find((g) => g.id === id)?.name || `#${id}`;
  }

  return (
    <div>
      <h1 className="page-title">Cycles</h1>
      <p className="page-sub">Start a new savings cycle and view past cycles.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {!isTreasurer && <ReadOnlyNotice />}

      {isTreasurer && (
        <div className="ledger-card">
          <h2 className="card-heading">Start a cycle</h2>
          <form onSubmit={startCycle}>
            {groups.length > 1 && (
              <div className="field">
                <label>Group</label>
                <select
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                  required
                >
                  <option value="">Select a group\u2026</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Start date</label>
              <input
                type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>End date</label>
              <input
                type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </div>
            {selectedGroupBlocked && (
              <div className="alert alert-error">
                This group already has an open cycle. Close it (via share-out) before starting another.
              </div>
            )}
            <button
              className="btn btn-brass" type="submit"
              disabled={saving || !form.group || selectedGroupBlocked}
            >
              {saving ? "Starting\u2026" : "Start cycle"}
            </button>
          </form>
        </div>
      )}

      <div className="ledger-card">
        <h2 className="card-heading">All cycles</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Fund balance</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id}>
                <td>{groupName(c.group)}</td>
                <td>{c.start_date}</td>
                <td>{c.end_date}</td>
                <td>
                  <span className={`stamp ${c.status === "open" ? "stamp-sage" : "stamp-rust"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="amount">MK {Number(c.fund_balance).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && cycles.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--ink-soft)" }}>No cycles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
