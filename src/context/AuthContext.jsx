import { createContext, useContext, useState } from "react";
import { login as apiLogin } from "../api/client";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("sacco_token"));
  const [username, setUsername] = useState(localStorage.getItem("sacco_username"));

  async function login(user, pass) {
    const t = await apiLogin(user, pass);
    localStorage.setItem("sacco_token", t);
    localStorage.setItem("sacco_username", user);
    setToken(t);
    setUsername(user);
  }

  function logout() {
    localStorage.removeItem("sacco_token");
    localStorage.removeItem("sacco_username");
    setToken(null);
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ token, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
