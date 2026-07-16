import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.6 20.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.6 20.6 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function PasswordField({ label, value, onChange, autoFocus, minLength, required }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          minLength={minLength}
          required={required}
          style={{ width: "100%", paddingRight: 40, boxSizing: "border-box" }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            color: "#666",
            display: "flex",
            alignItems: "center",
          }}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

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
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
            required
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          <button className="btn btn-brass" type="submit" disabled={saving}>
            {saving ? "Saving\u2026" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
