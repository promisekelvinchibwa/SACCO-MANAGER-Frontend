import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
];

// What the super admin sees instead: just their own dashboard. The
// "Onboard group" link is added separately below since it's already
// conditionally rendered on isSuperAdmin.
const adminLinks = [
  { to: "/", label: "Dashboard", end: true },
];

export default function Layout() {
  const { username, logout, mustChangePassword, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // A freshly-created login (generated temp password) must be changed
  // before touching anything else in the app.
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  const links = isSuperAdmin ? adminLinks : groupLinks;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Chikondi Ledger</div>
        <div className="brand-sub">SACCO manager</div>
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
        <Outlet />
      </main>
    </div>
  );
}
