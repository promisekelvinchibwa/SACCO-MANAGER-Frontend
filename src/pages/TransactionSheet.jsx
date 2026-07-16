import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function TransactionSheet() {
  const { cycles, loading: cyclesLoading } = useCycles();
  const { isTreasurer, username } = useAuth();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    client.get("/ledger-entries/")
      .then((res) => setEntries(res.data))
      .catch(() => setError("Could not load the transaction sheet."));
  }, []);

  const openCycle = cycles.find((c) => c.status === "open");
  const currentCycleEntries = openCycle
    ? entries.filter((entry) => entry.cycle === openCycle.id)
    : [];

  const normalizedSearch = search.trim().toLowerCase();
  const isMyEntry = (entry) => {
    const memberText = (entry.member_name || entry.member || "").toString().toLowerCase();
    return username && memberText.includes(username.toLowerCase());
  };

  const filteredEntries = useMemo(() => {
    return currentCycleEntries.filter((entry) => {
      if (tab === "my" && !isMyEntry(entry)) return false;

      if (normalizedSearch) {
        const memberText = (entry.member_name || entry.member || "").toString().toLowerCase();
        if (!memberText.includes(normalizedSearch)) return false;
      }

      const entryDate = entry.occurred_at?.slice(0, 10);
      if (startDate && entryDate && entryDate < startDate) return false;
      if (endDate && entryDate && entryDate > endDate) return false;
      return true;
    });
  }, [currentCycleEntries, normalizedSearch, startDate, endDate, tab, username]);

  function clearFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
  }

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
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              style={{
                background: tab === "all" ? "var(--ink)" : "var(--paper-raised)",
                color: tab === "all" ? "#fff" : "var(--ink)",
                border: tab === "all" ? "1px solid var(--ink)" : "1px solid var(--line)",
              }}
              onClick={() => setTab("all")}
            >
              Group transactions
            </button>
            <button
              type="button"
              className="btn"
              style={{
                background: tab === "my" ? "var(--ink)" : "var(--paper-raised)",
                color: tab === "my" ? "#fff" : "var(--ink)",
                border: tab === "my" ? "1px solid var(--ink)" : "1px solid var(--line)",
              }}
              onClick={() => setTab("my")}
            >
              My transactions
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
              <label style={{ display: "block" }}>Search names</label>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member name"
              />
            </div>
            <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
              <label style={{ display: "block" }}>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
              <label style={{ display: "block" }}>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button type="button" className="btn" onClick={clearFilters} style={{ marginBottom: 0 }}>
              Clear
            </button>
          </div>
        </div>
        <h2 className="card-heading">Current cycle transactions</h2>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Transaction</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.occurred_at?.slice(0, 10) || "-"}</td>
                <td>{entry.member_name || entry.member || "-"}</td>
                <td>{entry.entry_type_display || entry.entry_type}</td>
                <td className="amount">MK {Number(entry.amount).toLocaleString()}</td>
              </tr>
            ))}
            {openCycle && filteredEntries.length === 0 && (
              <tr><td colSpan={4} style={{ color: "var(--ink-soft)" }}>
                No transactions match the current filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
