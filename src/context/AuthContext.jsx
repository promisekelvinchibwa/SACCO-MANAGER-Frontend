import { createContext, useContext, useState } from "react";
import { login as apiLogin, register as apiRegister } from "../api/client";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("sacco_token"));
  const [username, setUsername] = useState(localStorage.getItem("sacco_username"));
  const [role, setRole] = useState(localStorage.getItem("sacco_role"));
  const [isSuperAdmin, setIsSuperAdmin] = useState(
    localStorage.getItem("sacco_is_superuser") === "true"
  );
  const [mustChangePassword, setMustChangePasswordState] = useState(
    localStorage.getItem("sacco_must_change_password") === "true"
  );
  const [groupName, setGroupName] = useState(localStorage.getItem("sacco_group_name"));
  const [joinCode, setJoinCode] = useState(localStorage.getItem("sacco_join_code"));
  const [groupHasOpenCycle, setGroupHasOpenCycle] = useState(
    localStorage.getItem("sacco_group_has_open_cycle") === "true"
  );
  const [managedGroups, setManagedGroups] = useState(
    JSON.parse(localStorage.getItem("sacco_managed_groups") || "[]")
  );
  // The member-side equivalent of managedGroups above: every group this
  // login has joined as a member. Kept in context (rather than fetched
  // locally by MemberGroupSwitcher, as it used to be) so it refreshes
  // any time applyMe runs -- e.g. right after joining a new group --
  // instead of only once when Layout first mounts.
  const [myGroups, setMyGroups] = useState(
    JSON.parse(localStorage.getItem("sacco_my_groups") || "[]")
  );

  async function applyMe(me) {
    localStorage.setItem("sacco_role", me.role);
    setRole(me.role);
    localStorage.setItem("sacco_must_change_password", String(!!me.must_change_password));
    setMustChangePasswordState(!!me.must_change_password);
    // Distinct from role: a Django superuser, not this app's treasurer
    // role. Only this gates the "onboard a new group" page.
    localStorage.setItem("sacco_is_superuser", String(!!me.is_superuser));
    setIsSuperAdmin(!!me.is_superuser);
    localStorage.setItem("sacco_group_name", me.group_name || "");
    setGroupName(me.group_name || "");
    localStorage.setItem("sacco_join_code", me.join_code || "");
    setJoinCode(me.join_code || "");
    localStorage.setItem("sacco_group_has_open_cycle", String(!!me.group_has_open_cycle));
    setGroupHasOpenCycle(!!me.group_has_open_cycle);
    const groups = me.managed_groups || [];
    localStorage.setItem("sacco_managed_groups", JSON.stringify(groups));
    setManagedGroups(groups);

    // Members can belong to several groups; refetch that list every
    // time applyMe runs (login, register, switch, refresh, and -- once
    // JoinGroup calls refreshMe() -- right after joining a new group)
    // so the sidebar dropdown always reflects reality instead of a
    // one-time snapshot taken when Layout first mounted.
    if (me.role === "member") {
      try {
        const res = await client.get("/me/my-groups/");
        localStorage.setItem("sacco_my_groups", JSON.stringify(res.data));
        setMyGroups(res.data);
      } catch {
        // Leave whatever was there before rather than wiping it out on
        // a transient network error.
      }
    } else {
      localStorage.removeItem("sacco_my_groups");
      setMyGroups([]);
    }
  }

  async function login(user, pass) {
    const t = await apiLogin(user, pass);
    localStorage.setItem("sacco_token", t);
    localStorage.setItem("sacco_username", user);
    setToken(t);
    setUsername(user);

    // Fetch role right away so the UI can gate itself correctly from
    // the first render, not just after the backend rejects a write.
    const me = await client.get("/me/", { headers: { Authorization: `Token ${t}` } });
    await applyMe(me.data);
  }

  // Public self-registration: creates the login (as a treasurer starting
  // a new group, or a member joining one via its join code) and signs
  // them straight in with the token the backend hands back -- no
  // separate login step needed right after signing up.
  async function register(payload) {
    const data = await apiRegister(payload);
    localStorage.setItem("sacco_token", data.token);
    localStorage.setItem("sacco_username", payload.username);
    setToken(data.token);
    setUsername(payload.username);

    const me = await client.get("/me/", { headers: { Authorization: `Token ${data.token}` } });
    await applyMe(me.data);
    return data;
  }

  // Flips which of a treasurer's managed groups every screen is scoped
  // to. Re-fetches /me/ afterwards so group_name/join_code stay in sync
  // with whichever group is now active.
  async function switchGroup(groupId) {
    await client.post("/me/switch-group/", { group_id: groupId });
    const me = await client.get("/me/");
    await applyMe(me.data);
  }

  // Re-pulls /me/ without changing anything server-side -- used after
  // an action (like creating a new group) that already changed the
  // active group on the backend, so the frontend just needs to catch up.
  async function refreshMe() {
    const me = await client.get("/me/");
    await applyMe(me.data);
  }

  function logout() {
    localStorage.removeItem("sacco_token");
    localStorage.removeItem("sacco_username");
    localStorage.removeItem("sacco_role");
    localStorage.removeItem("sacco_must_change_password");
    localStorage.removeItem("sacco_is_superuser");
    localStorage.removeItem("sacco_group_name");
    localStorage.removeItem("sacco_join_code");
    localStorage.removeItem("sacco_group_has_open_cycle");
    localStorage.removeItem("sacco_managed_groups");
    localStorage.removeItem("sacco_my_groups");
    setToken(null);
    setUsername(null);
    setRole(null);
    setMustChangePasswordState(false);
    setIsSuperAdmin(false);
    setGroupName(null);
    setJoinCode(null);
    setGroupHasOpenCycle(false);
    setManagedGroups([]);
    setMyGroups([]);
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
      value={{
        token, username, role, isTreasurer, isSuperAdmin,
        mustChangePassword, groupName, joinCode, groupHasOpenCycle, managedGroups, myGroups,
        login, register, logout, clearMustChangePassword, switchGroup, refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
