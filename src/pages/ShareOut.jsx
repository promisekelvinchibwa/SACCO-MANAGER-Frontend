import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../context/AuthContext";
import ReadOnlyNotice from "../components/ReadOnlyNotice";

export default function ShareOut() {
  const { isTreasurer, refreshMe } = useAuth();
  const { cycles, reload: reloadCycles } = useCycles();
  const [members, setMembers] = useState([]);
  const [shareOuts, setShareOuts] = useState([]);
  const [message, setMessage] = useState(null);
  const [computing, setComputing] = useState(false);

  const openCycle = cycles.find((c) => c.status === "open");
  const [tab, setTab] = useState("current");

  const memberName = (memberOrId) => {
    if (!memberOrId) return "";

    if (typeof memberOrId === "object") {
      if (memberOrId.full_name) return memberOrId.full_name;
      if (memberOrId.member_name) return memberOrId.member_name;
      if (memberOrId.first_name || memberOrId.firstName || memberOrId.last_name || memberOrId.lastName) {
        return `${memberOrId.first_name || memberOrId.firstName || ""} ${memberOrId.last_name || memberOrId.lastName || ""}`.trim();
      }
      return memberOrId.id ? `#${memberOrId.id}` : "";
    }

    const m = members.find((mm) => mm.id === memberOrId || mm.id === Number(memberOrId));
    if (!m) return `#${memberOrId}`;
    return m.full_name || `${m.first_name || m.firstName || ""} ${m.last_name || m.lastName || ""}`.trim();
  };

  const computeShareOut = async () => {
    if (!openCycle) {
      setMessage({ type: "error", text: "No open cycle to compute." });
      return;
    }
    setComputing(true);
    try {
      await client.post(`/cycles/${openCycle.id}/share_out/`, {});
      setMessage({ type: "success", text: "Share-out computed." });
      reloadCycles();
      const resp = await client.get("/share-outs/");
      setShareOuts(resp.data || []);
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Failed to compute share-out." });
    } finally {
      setComputing(false);
    }
  };

  useEffect(() => {
    client.get("/share-outs/").then((r) => setShareOuts(r.data || [])).catch(() => {});
    client.get("/members/").then((r) => setMembers(r.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="page-title">Share-out</h1>
      <p className="page-sub">Compute the end-of-cycle distribution. Total distributed always reconciles to the fund.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {!isTreasurer && <ReadOnlyNotice />}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className="btn"
          style={{
            background: tab === "current" ? "var(--ink)" : "var(--paper-raised)",
            color: tab === "current" ? "#fff" : "var(--ink)",
            border: tab === "current" ? "1px solid var(--ink)" : "1px solid var(--line)",
          }}
          onClick={() => setTab("current")}
        >
          Current cycle
        </button>
        <button
          type="button"
          className="btn"
          style={{
            background: tab === "archives" ? "var(--ink)" : "var(--paper-raised)",
            color: tab === "archives" ? "#fff" : "var(--ink)",
            border: tab === "archives" ? "1px solid var(--ink)" : "1px solid var(--line)",
          }}
          onClick={() => setTab("archives")}
        >
          Archives
        </button>
      </div>

      {tab === "current" && (
        <div className="ledger-card" style={{ backgroundImage: "none" }}>
          <h2 className="card-heading">Current cycle</h2>
          {openCycle ? (
            <>
              <div className="stat-row" style={{ marginBottom: 16 }}>
                <div className="stat-box">
                  <div className="stat-label">Fund balance</div>
                  <div className="stat-value">MK {Number(openCycle.fund_balance).toLocaleString()}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Cycle dates</div>
                  <div className="stat-value" style={{ fontSize: 14 }}>{openCycle.start_date} &ndash; {openCycle.end_date}</div>
                </div>
              </div>
              {isTreasurer && (
                <button className="btn btn-brass" onClick={computeShareOut} disabled={computing}>
                  {computing ? "Computing\u2026" : "Compute share-out for this cycle"}
                </button>
              )}
            </>
          ) : (
            <p style={{ color: "var(--ink-soft)" }}>No open cycle.</p>
          )}
        </div>
      )}

      {tab === "archives" && (
        <div>
          {shareOuts.length === 0 && (
            <div className="ledger-card" style={{ backgroundImage: "none" }}>
              <p style={{ color: "var(--ink-soft)" }}>No past share-outs.</p>
            </div>
          )}
          {shareOuts.map((so) => (
            <div className="ledger-card" key={so.id} style={{ backgroundImage: "none" }}>
              <h2 className="card-heading">Share-out statement &mdash; cycle #{so.cycle}</h2>
              <div className="stat-row" style={{ marginBottom: 16 }}>
                <div className="stat-box">
                  <div className="stat-label">Total fund</div>
                  <div className="stat-value">MK {Number(so.total_fund).toLocaleString()}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Distributed</div>
                  <div className="stat-value">MK {Number(so.total_distributed).toLocaleString()}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Carried forward</div>
                  <div className="stat-value">MK {Number(so.total_carried_forward).toLocaleString()}</div>
                </div>
              </div>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Savings</th>
                    <th>Gross share</th>
                    <th>Loan deduction</th>
                    <th>Net payout</th>
                  </tr>
                </thead>
                <tbody>
                  {so.details.map((d) => (
                    <tr key={d.id}>
                      <td>{memberName(d.member || d.member_name)}</td>
                      <td className="amount">MK {Number(d.savings_amount).toLocaleString()}</td>
                      <td className="amount">MK {Number(d.gross_share).toLocaleString()}</td>
                      <td className="amount amount-neg">
                        {Number(d.loan_deduction) > 0 ? `MK ${Number(d.loan_deduction).toLocaleString()}` : "\u2014"}
                      </td>
                      <td className="amount amount-pos">MK {Number(d.net_payout).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
