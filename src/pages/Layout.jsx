import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import { extractErrorMessage } from "../utils/errors";

// Group-scoped links: irrelevant to the super admin, who isn't a
// member of any group, so these are only shown for treasurer/member logins.
const groupLinks = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/members", label: "Members" },
  { to: "/cycles", label: "Cycles" },
  { to: "/savings", label: "Meetings & savings" },
  { to: "/loans", label: "Loans" },
  { to: "/loan-requests", label: "Loan requests" },
  { to: "/fines", label: "Fines" },
  { to: "/share-out", label: "Share-out" },
  { to: "/transactions", label: "Transaction sheet" },
];

// What the super admin sees instead: just their own dashboard. The
// "Onboard group" link is added separately below since it's already
// conditionally rendered on isSuperAdmin.
const adminLinks = [
  { to: "/", label: "Dashboard", end: true },
];

// Resets a <button>'s native chrome so it can sit inline with the
// NavLink items in the sidebar nav and pick up the same .nav-link
// spacing/typography/hover styling as everything else there.
const navButtonStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
  font: "inherit",
};

// A fully custom listbox used by both group switchers below, in place
// of a native <select>. Gives full control over styling (brass accent,
// parchment background, custom hover/selected states) that a native
// dropdown's OS-rendered popup can't provide. Handles its own
// open/close state, click-outside dismissal, and basic keyboard support.
function GroupDropdown({ options, value, onChange, disabled, placeholder = "Select a group\u2026" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleTriggerKeyDown(e) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function selectOption(id) {
    setOpen(false);
    if (id !== value) onChange(id);
  }

  return (
    <div className="group-dropdown" ref={rootRef}>
      <button
        type="button"
        className="group-dropdown-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="group-dropdown-trigger-label">{selected ? selected.name : placeholder}</span>
        <svg className="group-dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="group-dropdown-list" role="listbox" tabIndex={-1}>
          {options.map((o) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              className={"group-dropdown-option" + (o.id === value ? " selected" : "")}
              onClick={() => selectOption(o.id)}
            >
              {o.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Shown only to treasurers -- members belong to exactly one group and
// have no reason to switch. Lets a treasurer running several SACCOs
// flip which one every screen is scoped to. The dropdown lives above
// the main nav; "Show join code" and "+ New group" live inside the nav
// itself (see Layout below) so they line up with every other link.
function GroupSwitcher() {
  const { groupName, managedGroups, switchGroup } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  const activeId = managedGroups.find((g) => g.name === groupName)?.id ?? null;

  async function handleSelect(id) {
    setError("");
    setSwitching(true);
    try {
      await switchGroup(id);
      // Redirect to the dashboard for the newly-active group. Without
      // this, staying on the current page (e.g. Members, Loans) would
      // keep showing data fetched for the old group, since those pages
      // only fetch on mount and switching alone doesn't remount them.
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err, "Could not switch group."));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="sidebar-group-switcher" style={{ marginBottom: 16 }}>
      {managedGroups.length > 1 ? (
        <GroupDropdown
          options={managedGroups}
          value={activeId}
          onChange={handleSelect}
          disabled={switching}
        />
      ) : (
        <div style={{ fontWeight: 600 }}>{groupName}</div>
      )}
      {error && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// The member-side equivalent of GroupSwitcher above: a member can
// belong to several groups (each backed by its own Member row, see
// Member.user), and this lets them flip which one every screen is
// scoped to. Falls back to a plain group-name label when they've only
// joined one, same as the treasurer switcher does.
function MemberGroupSwitcher() {
  const { groupName, myGroups, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  const activeId = myGroups.find((g) => g.name === groupName)?.id ?? null;

  async function handleSelect(id) {
    setError("");
    setSwitching(true);
    try {
      await client.post("/me/switch-group/", { group_id: id });
      // Re-sync AuthContext (group name, member id, myGroups, etc.) to
      // match the newly-active group.
      await refreshMe();
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err, "Could not switch group."));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="sidebar-group-switcher" style={{ marginBottom: 16 }}>
      {myGroups.length > 1 ? (
        <GroupDropdown
          options={myGroups}
          value={activeId}
          onChange={handleSelect}
          disabled={switching}
        />
      ) : (
        <div style={{ fontWeight: 600 }}>{groupName}</div>
      )}
      {error && <div className="alert alert-error" style={{ fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export default function Layout() {
  const { username, role, groupName, joinCode, logout, mustChangePassword, isSuperAdmin, isTreasurer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCode, setShowCode] = useState(false); // Keep this line for state management

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // A freshly-created login (generated temp password) must be changed
  // before touching anything else in the app.
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  const isMember = role === "member";

  // Members get one extra link -- treasurers get their own two below
  // (Show join code / + New group), added directly in the nav so
  // everything sits in the same aligned column.
  const links = isSuperAdmin
    ? adminLinks
    : isMember
    ? [...groupLinks, { to: "/join-group", label: "Join another group" }]
    : groupLinks;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Community SACCO Manager</div>
        <div className="brand-sub">Multi-group platform</div>
        {isTreasurer && <GroupSwitcher />}
        {isMember && <MemberGroupSwitcher />}
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
          {isTreasurer && (
            <NavLink
              to="/create-group"
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              + New group
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink
              to="/onboard-group"
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              style={{ marginTop: 12 }}
            >
              Onboard group
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          Signed in as {username}
          <br />
          <NavLink to="/change-password" className="nav-link" style={{ display: "inline-block", padding: 0, marginBottom: 8 }}>
            Change password
          </NavLink>
          <br />
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {/* Keying on the active group (rather than letting Outlet key
            off the route path alone) forces every group-scoped page to
            fully remount -- and therefore refetch -- whenever the
            active group changes. This matters because navigate("/")
            from the group switchers is a no-op if you're already on
            "/": without this key, a treasurer switching groups while
            sitting on the dashboard would keep seeing the previous
            group's members/loans/balance, since that page's data only
            ever loads once on mount. */}
        <Outlet key={`${groupName || ""}::${joinCode || ""}`} />
      </main>
    </div>
  );
}
