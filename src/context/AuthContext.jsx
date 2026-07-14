import { createContext, useContext, useState } from "react";
import { login as apiLogin } from "../api/client";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("sacco_token"));
  const [username, setUsername] = useState(localStorage.getItem("sacco_username"));
  const [role, setRole] = useState(localStorage.getItem("sacco_role"));
  const [mustChangePassword, setMustChangePasswordState] = useState(
    localStorage.getItem("sacco_must_change_password") === "true"
  );

  async function login(user, pass) {
    const t = await apiLogin(user, pass);
    localStorage.setItem("sacco_token", t);
    localStorage.setItem("sacco_username", user);
    setToken(t);
    setUsername(user);

    // Fetch role right away so the UI can gate itself correctly from
    // the first render, not just after the backend rejects a write.
    const me = await client.get("/me/", { headers: { Authorization: `Token ${t}` } });
    localStorage.setItem("sacco_role", me.data.role);
    setRole(me.data.role);
    localStorage.setItem("sacco_must_change_password", String(!!me.data.must_change_password));
    setMustChangePasswordState(!!me.data.must_change_password);
  }

  function logout() {
    localStorage.removeItem("sacco_token");
    localStorage.removeItem("sacco_username");
    localStorage.removeItem("sacco_role");
    localStorage.removeItem("sacco_must_change_password");
    setToken(null);
    setUsername(null);
    setRole(null);
    setMustChangePasswordState(false);
  }

  // Called once the person has successfully set their own password, so
  // the forced-redirect guard stands down without needing a re-login.
  function clearMustChangePassword() {
    localStorage.setItem("sacco_must_change_password", "false");
    setMustChangePasswordState(false);
  }

  const isTreasurer = role === "treasurer";

  return (
    <AuthContext.Provider
      value={{ token, username, role, isTreasurer, mustChangePassword, login, logout, clearMustChangePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}