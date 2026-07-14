import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ChangePassword() {
  const { mustChangePassword, clearMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    try {
      await client.post("/me/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      clearMustChangePassword();
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.current_password?.[0] ||
        data?.new_password?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        "Could not update password."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Change password</h1>
      <p className="page-sub">
        {mustChangePassword
          ? "For your security, set your own password before continuing."
          : "Update the password for your account."}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ledger-card" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-brass" type="submit" disabled={saving}>
            {saving ? "Saving\u2026" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}