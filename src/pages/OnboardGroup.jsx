import { useState } from "react";
import client from "../api/client";

export default function OnboardGroup() {
  const [form, setForm] = useState({
    name: "",
    treasurer_full_name: "",
    treasurer_phone: "",
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setCredentials(null);
    setSaving(true);
    try {
      const res = await client.post("/groups/onboard/", {
        name: form.name,
        treasurer_full_name: form.treasurer_full_name,
        treasurer_phone: form.treasurer_phone,
      });
      setMessage({ type: "success", text: `${res.data.group.name} created.` });
      setCredentials({
        groupName: res.data.group.name,
        username: res.data.treasurer_username,
        password: res.data.generated_password,
      });
      setForm({ name: "", treasurer_full_name: "", treasurer_phone: "" });
    } catch (err) {
      const data = err.response?.data;
      const text =
        data?.name?.[0] ||
        data?.treasurer_username?.[0] ||
        data?.treasurer_full_name?.[0] ||
        data?.detail ||
        "Could not create group.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Onboard a new group</h1>
      <p className="page-sub">
        Create a brand-new SACCO and its first treasurer login. This account manages the platform
        as a whole &mdash; each group below runs fully independently once its treasurer is set up.
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {credentials && (
        <div className="ledger-card" style={{ borderColor: "var(--brass)" }}>
          <h2 className="card-heading">Treasurer login for {credentials.groupName}</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 12 }}>
            Write these down or hand them to the treasurer now &mdash; the password is shown only
            this once and can&rsquo;t be retrieved again. They&rsquo;ll be asked to set their own
            password the first time they sign in.
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

      <div className="ledger-card">
        <h2 className="card-heading">New group</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Group name</label>
            <input
              type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Umodzi Savings Group"
              required
            />
          </div>
          <div className="field">
            <label>Treasurer's full name</label>
            <input
              type="text" value={form.treasurer_full_name}
              onChange={(e) => setForm({ ...form, treasurer_full_name: e.target.value })}
              placeholder="e.g. Grace Banda"
              required
            />
          </div>
          <div className="field">
            <label>Treasurer's phone</label>
            <input
              type="text" value={form.treasurer_phone}
              onChange={(e) => setForm({ ...form, treasurer_phone: e.target.value })}
              placeholder="e.g. 099 123 4567"
            />
          </div>
          <button className="btn btn-brass" type="submit" disabled={saving}>
            {saving ? "Creating\u2026" : "Create group & treasurer"}
          </button>
        </form>
      </div>
    </div>
  );
}
