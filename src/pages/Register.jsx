import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../utils/errors";

export default function Register() {
  const [role, setRole] = useState("treasurer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const payload = {
      username, password, full_name: fullName, phone, role,
      ...(role === "treasurer"
        ? { group_name: groupName }
        : { join_code: joinCode.trim().toUpperCase(), national_id: nationalId }),
    };

    setLoading(true);
    try {
      const data = await register(payload);
      if (role === "treasurer") {
        // Show the new join code once before moving on -- this is the
        // treasurer's one chance to copy it straight from the screen.
        setResult(data);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="login-title">Group created</h1>
          <p className="login-sub">{result.group_name}</p>
          <div className="alert" style={{ marginBottom: 16 }}>
            <strong>Your join code:</strong>{" "}
            <span className="amount" style={{ fontSize: 20, letterSpacing: "0.1em" }}>
              {result.join_code}
            </span>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              Share this code with your members &mdash; they'll use it to create their own
              accounts and join your group directly, without you creating a login for each of them.
            </p>
          </div>
          <button className="btn btn-brass" style={{ width: "100%" }} onClick={() => navigate("/")}>
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="login-title">Community SACCO Manager</h1>
        <p className="login-sub">Create your account</p>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label>I am a&hellip;</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={role === "treasurer" ? "btn btn-brass" : "btn"}
              style={{ flex: 1 }}
              onClick={() => setRole("treasurer")}
            >
              Treasurer &mdash; starting a group
            </button>
            <button
              type="button"
              className={role === "member" ? "btn btn-brass" : "btn"}
              style={{ flex: 1 }}
              onClick={() => setRole("member")}
            >
              Member &mdash; joining a group
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {role === "treasurer" ? (
            <div className="field">
              <label>Group name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Chikondi Savings Group"
                required
              />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Group join code</label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Given to you by your treasurer"
                  style={{ textTransform: "uppercase" }}
                  required
                />
              </div>
              <div className="field">
                <label>National ID</label>
                <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} required />
              </div>
            </>
          )}

          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button className="btn btn-brass" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Creating account\u2026" : "Create account"}
          </button>
        </form>

        <p className="login-sub" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
