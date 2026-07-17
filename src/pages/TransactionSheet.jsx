import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";
import { notifyCountsChanged } from "../utils/notify";

export default function TransactionSheet() {
  const { cycles, loading: cyclesLoading } = useCycles();
  const { isTreasurer, username, role } = useAuth();
  const [entries, setEntries] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [editingAmounts, setEditingAmounts] = useState({});
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [entriesRes, correctionsRes] = await Promise.all([
          client.get("/ledger-entries/"),
          client.get("/ledger-entry-corrections/?status=pending"),
          client.get("/loan-requests/?status=approved"),
        ]);
        setEntries(entriesRes.data);
        setCorrections(correctionsRes.data);
        // third response is approved loan requests
        // when the endpoint returns an array, take its length
        const approved = entriesRes && entriesRes.data ? 0 : 0;
        try {
          const approvedRes = await client.get("/loan-requests/?status=approved");
          setApprovedRequestsCount(approvedRes.data?.length || 0);
        } catch (e) {
          setApprovedRequestsCount(0);
        }
      } catch (err) {
        setError("Could not load the transaction sheet.");
      }
    }
    loadData();
  }, []);

  async function refreshData() {
    try {
      const [entriesRes, correctionsRes] = await Promise.all([
        client.get("/ledger-entries/"),
        client.get("/ledger-entry-corrections/?status=pending"),
      ]);
      setEntries(entriesRes.data);
      setCorrections(correctionsRes.data);
      setActionError("");
    } catch (err) {
      setActionError("Could not refresh transaction data.");
    }
  }

  function getPendingCorrection(entryId) {
    return corrections.find((correction) => correction.ledger_entry === entryId && correction.status === "pending");
  }

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
      if (tab === "my" && !isTreasurer && !isMyEntry(entry)) return false;

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

  function handleAmountChange(entryId, value) {
    setEditingAmounts((prev) => ({ ...prev, [entryId]: value }));
  }

  async function submitCorrection(entry) {
    setActionError("");
    const requestedAmount = editingAmounts[entry.id];
    if (requestedAmount === undefined || requestedAmount === "") {
      setActionError("Enter a corrected amount before submitting.");
      return;
    }
    if (Number(requestedAmount) === Number(entry.amount)) {
      setActionError("The new amount must be different from the current one.");
      return;
    }

    try {
      await client.post("/ledger-entry-corrections/", {
        ledger_entry: entry.id,
        requested_amount: requestedAmount,
      });
      await refreshData();
      notifyCountsChanged();
    } catch (err) {
      setActionError("Could not submit the correction request.");
    }
  }

  async function voteCorrection(correctionId, approved) {
    setActionError("");
    try {
      await client.post(`/ledger-entry-corrections/${correctionId}/vote/`, { approved });
      await refreshData();
      notifyCountsChanged();
    } catch (err) {
      setActionError("Could not submit your vote.");
    }
  }

  const pendingCorrections = corrections.filter((correction) => correction.status === "pending");

  return (
    <div className="no-lines">
      <h1 className="page-title">Transaction sheet</h1>
      <p className="page-sub">All transactions recorded by the treasurer for the current open cycle.</p>
      {approvedRequestsCount > 0 && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            Approved loan requests processed: <strong>{approvedRequestsCount}</strong>
          </span>
        </div>
      )}

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
        {actionError && <div className="alert alert-error">{actionError}</div>}
        <table className="ledger-table" style={{ fontSize: 16 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Member</th>
              <th>Transaction</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.transaction_number ?? entry.id}</td>
                <td>{entry.occurred_at?.slice(0, 10) || "-"}</td>
                <td>{entry.member_name || entry.member || "-"}</td>
                <td>{entry.entry_type_display || entry.entry_type}</td>
                <td className="amount">
                  {isTreasurer && !entry.pending_correction ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        step="0.01"
                        value={editingAmounts[entry.id] ?? entry.amount}
                        onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                        style={{ width: 160, minWidth: 140, padding: "8px 10px", fontSize: 16 }}
                      />
                      {(editingAmounts[entry.id] !== undefined && editingAmounts[entry.id] !== "" && String(editingAmounts[entry.id]) !== String(entry.amount)) && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => submitCorrection(entry)}
                        >
                          Update
                        </button>
                      )}
                    </div>
                  ) : entry.pending_correction ? (
                    <div>
                      MK {Number(entry.amount).toLocaleString()}
                      <div style={{ fontSize: "0.9em", color: "var(--ink-soft)", marginTop: 4 }}>
                        Pending correction to MK {Number(entry.pending_correction.requested_amount).toLocaleString()} (
                        {entry.pending_correction.yes_votes} / {entry.pending_correction.member_count} approvals)
                      </div>
                    </div>
                  ) : (
                    <>
                      MK {Number(entry.amount).toLocaleString()}
                      {entry.loan_outstanding != null && (
                        <div style={{ fontSize: "0.9em", color: "var(--ink-soft)", marginTop: 4 }}>
                          Loan balance: MK {Number(entry.loan_outstanding).toLocaleString()}
                        </div>
                      )}
                    </>
                  )}
                </td>
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

      {pendingCorrections.length > 0 && (
        <div className="ledger-card" style={{ marginTop: 24 }}>
          <h2 className="card-heading">Pending correction approvals</h2>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Current</th>
                <th>Requested</th>
                <th>Approvals</th>
                {role === "member" && <th>Your vote</th>}
              </tr>
            </thead>
            <tbody>
              {pendingCorrections.map((correction) => (
                <tr key={correction.id}>
                  <td>{correction.ledger_entry}</td>
                  <td>MK {Number(correction.old_amount).toLocaleString()}</td>
                  <td>MK {Number(correction.requested_amount).toLocaleString()}</td>
                  <td>
                    {correction.yes_votes} yes / {correction.no_votes} no
                    <div style={{ fontSize: "0.9em", color: "var(--ink-soft)" }}>
                      {correction.member_count} group members
                    </div>
                  </td>
                  {role === "member" && (
                    <td>
                      <button type="button" className="btn" onClick={() => voteCorrection(correction.id, true)}>
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => voteCorrection(correction.id, false)}
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
