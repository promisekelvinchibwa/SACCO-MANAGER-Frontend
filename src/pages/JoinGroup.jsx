import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinGroup } from "../api/client";

export default function JoinGroup() {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Only the join code is needed -- your national ID is already on
      // file from when you first registered, so it's looked up on the
      // backend rather than re-typed here.
      await joinGroup({ join_code: joinCode });
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      const text = data?.join_code?.[0] || data?.detail || "Could not join group. Check the code and try again.";
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Join another group</h1>
      <p className="page-sub">
        Enter the join code given to you by that group&rsquo;s treasurer.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ledger-card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Join code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-brass" type="submit" disabled={saving || !joinCode.trim()}>
            {saving ? "Joining\u2026" : "Join group"}
          </button>
        </form>
      </div>
    </div>
  );
}
