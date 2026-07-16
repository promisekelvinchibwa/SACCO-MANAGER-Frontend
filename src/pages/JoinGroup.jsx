import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinGroup } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function JoinGroup() {
  const [form, setForm] = useState({ join_code: "", national_id: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await joinGroup(form);
      // Re-sync AuthContext -- pulls the freshly-joined group into
      // myGroups (so the sidebar dropdown shows it) and picks up
      // whichever group the backend made active as a result of joining.
      await refreshMe();
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      const text =
        data?.join_code?.[0] ||
        data?.national_id?.[0] ||
        data?.detail ||
        "Could not join group. Check the code and try again.";
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Join another group</h1>
      <p className="page-sub">
        Enter the join code given to you by that group&rsquo;s treasurer, along with your national ID.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ledger-card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Join code</label>
            <input
              type="text"
              value={form.join_code}
              onChange={(e) => setForm({ ...form, join_code: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>National ID</label>
            <input
              type="text"
              value={form.national_id}
              onChange={(e) => setForm({ ...form, national_id: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-brass" type="submit" disabled={saving}>
            {saving ? "Joining\u2026" : "Join group"}
          </button>
        </form>
      </div>
    </div>
  );
}
