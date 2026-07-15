import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import RequireSuperAdmin from "./components/RequireSuperAdmin";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Members from "./pages/Members";
import Cycles from "./pages/Cycles";
import Savings from "./pages/Savings";
import Loans from "./pages/Loans";
import LoanRequests from "./pages/LoanRequests";
import Fines from "./pages/Fines";
import ShareOut from "./pages/ShareOut";
import ChangePassword from "./pages/ChangePassword";
import OnboardGroup from "./pages/OnboardGroup";

// The super admin isn't a member of any group, so the group-scoped
// Dashboard (fund balance, members, active loans) makes no sense for
// them -- they get their own summary view instead.
function RootDashboard() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <AdminDashboard /> : <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<RootDashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="cycles" element={<Cycles />} />
            <Route path="savings" element={<Savings />} />
            <Route path="loans" element={<Loans />} />
            <Route path="loan-requests" element={<LoanRequests />} />
            <Route path="fines" element={<Fines />} />
            <Route path="share-out" element={<ShareOut />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route
              path="onboard-group"
              element={
                <RequireSuperAdmin>
                  <OnboardGroup />
                </RequireSuperAdmin>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
