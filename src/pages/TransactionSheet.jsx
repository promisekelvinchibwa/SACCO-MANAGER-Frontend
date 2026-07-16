import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function TransactionSheet() {
  const { cycles, loading: cyclesLoading } = useCycles();
  const { isTreasurer } = useAuth();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    client.get("/ledger-entries/")
      .then((res) => setEntries(res.data))
      .catch(() => setError("Could not load the transaction sheet."));
  }, []);

  const openCycle = cycles.find((c) => c.status === "open");
  const currentCycleEntries = openCycle
    ? entries.filter((entry) => entry.cycle === openCycle.id)
    : [];

  return (
    <div>
      <h1 className="page-title">Transaction sheet</h1>
      <p className="page-sub">All transactions recorded by the treasurer for the current open cycle.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {!openCycle && (
        <div className="alert alert-warning">
          There is no open cycle right now, so no current-cycle transactions can be displayed.
        </div>
      )}

      {!isTreasurer && <ReadOnlyNotice />}

      <div className="ledger-card">
        <h2 className="card-heading">Current cycle transactions</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Transaction</th>
              <th>Amount</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {currentCycleEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.occurred_at?.slice(0, 10) || "-"}</td>
                <td>{entry.member_name || entry.member || "-"}</td>
                <td>{entry.entry_type_display || entry.entry_type}</td>
                <td className="amount">MK {Number(entry.amount).toLocaleString()}</td>
                <td>{entry.ref_label || "—"}</td>
              </tr>
            ))}
            {openCycle && currentCycleEntries.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--ink-soft)" }}>No transactions have been recorded for this open cycle yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
