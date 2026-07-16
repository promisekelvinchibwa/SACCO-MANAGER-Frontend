import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function Members() {
  const { isTreasurer, joinCode, groupHasOpenCycle } = useAuth();
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({
    full_name: "",
    national_id: "",
    phone: "",
    group: "",
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);

  function loadMembers() {
    client.get("/members/").then((res) => setMembers(res.data));
  }

  useEffect(() => {
    loadMembers();
    if (isTreasurer) {
      client.get("/groups/").then((res) => {
        setGroups(res.data);
        // Auto-select when there's only one group, since that's the common case.
        if (res.data.length === 1) {
          setForm((f) => ({ ...f, group: res.data[0].id }));
        }
      });
    }
  }, [isTreasurer]);

  async function addMember(e) {
    e.preventDefault();
    setMessage(null);
    setCredentials(null);
    setSaving(true);
    try {
      // Creates the Member AND a login for them in one step: /profiles/create_user/
      // accepts new-member fields directly and generates a username +
      // temporary password when none are supplied.
      const res = await client.post("/profiles/create_user/", {
        group: form.group,
        full_name: form.full_name,
        national_id: form.national_id,
        phone: form.phone,
        role: "member",
      });
      setMessage({ type: "success", text: "Member added and login created." });
      setCredentials({
        username: res.data.username,
        password: res.data.generated_password,
        full_name: form.full_name,
      });
      setForm({
        full_name: "",
        national_id: "",
        phone: "",
        group: form.group, // keep the group selected for the next entry
      });
      loadMembers();
    } catch (err) {
      const data = err.response?.data;
      const text =
        data?.national_id?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        "Could not add member.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Members</h1>
      <p className="page-sub">Register new members and view the member roll.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {!isTreasurer && <ReadOnlyNotice />}

      {credentials && (
        <div className="ledger-card" style={{ borderColor: "var(--brass)" }}>
          <h2 className="card-heading">Login details for {credentials.full_name}</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 12 }}>
            Write these down or hand them to the member now &mdash; the password is shown only this once
            and can&rsquo;t be retrieved again. They&rsquo;ll be asked to set their own password the first
            time they sign in.
          </p>
          <div style={{ display: "flex", gap: 24, fontFamily: "monospace", fontSize: 16 }}>
            <div><strong>Username:</strong> {credentials.username}</div>
            <div><strong>Password:</strong> {credentials.password}</div>
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setCredentials(null)}>
            Done, dismiss
          </button>
        </div>
      )}

      {isTreasurer && (
        <div className="ledger-card" style={{ position: "relative", backgroundImage: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="card-heading" style={{ margin: 0 }}>Add a member</h2>
            {joinCode && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>Join code</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div className="amount" style={{ background: "var(--ink)", color: "#fff", padding: "6px 10px", borderRadius: 6 }}>
                    {joinCode}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigator.clipboard?.writeText(joinCode)}
                    style={{ padding: "8px 10px" }}
                  >Copy</button>
                </div>
              </div>
            )}
          </div>
          {groupHasOpenCycle && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              This group currently has an open cycle. New members cannot be added until share-out is complete.
            </div>
          )}
          <form onSubmit={addMember}>
            <fieldset disabled={groupHasOpenCycle} style={{ border: "none", padding: 0 }}>
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
              <label>Full name</label>
              <input
                type="text" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>National ID</label>
              <input
                type="text" value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="text" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <button className="btn btn-brass" type="submit" disabled={saving || !form.group}>
              {saving ? "Adding…" : "Add member"}
            </button>
          </fieldset>
          </form>
        </div>
      )}

      <div className="ledger-card">
        <h2 className="card-heading">Member roll</h2>
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