import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../utils/errors";

export default function CreateGroup() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // Set once the group's been created -- holds the full Group record
  // back from the API, including its join_code, so we can show a
  // proper result screen instead of a one-off alert/prompt.
  const [created, setCreated] = useState(null);
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await client.post("/groups/create_own/", { name });
      // The backend already switched the active group to the new one --
      // re-sync AuthContext (sidebar group name/dropdown, join code,
      // etc.) so the rest of the app reflects it right away.
      await refreshMe();
      setCreated(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, "Could not create group."));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div>
        <h1 className="page-title">Group created</h1>
        <p className="page-sub">&ldquo;{created.name}&rdquo; is ready to go, and is now your active group.</p>

        <div className="ledger-card" style={{ borderColor: "var(--brass)" }}>
          <h2 className="card-heading">Join code</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 12 }}>
            Share this code with members so they can join &ldquo;{created.name}&rdquo; themselves &mdash;
            either at signup, or via &ldquo;Join another group&rdquo; if they already have a login.
          </p>
          <div style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: 3 }}>
            {created.join_code}
          </div>
          <button className="btn btn-brass" style={{ marginTop: 20 }} onClick={() => navigate("/")}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Create a new group</h1>
      <p className="page-sub">Start another SACCO group under your treasurer login.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ledger-card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-brass" type="submit" disabled={saving || !name.trim()}>
            {saving ? "Creating\u2026" : "Create group"}
          </button>
        </form>
      </div>
    </div>
  );
}
