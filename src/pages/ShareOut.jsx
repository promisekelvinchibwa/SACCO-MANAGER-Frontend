import { useEffect, useState } from "react";
import client from "../api/client";
import { useCycles } from "../hooks/useCycles";

export default function ShareOut() {
  const { cycles, reload: reloadCycles } = useCycles();
  const [members, setMembers] = useState([]);
  const [shareOuts, setShareOuts] = useState([]);
  const [message, setMessage] = useState(null);
  const [computing, setComputing] = useState(false);

  const openCycle = cycles.find((c) => c.status === "open");

  function loadShareOuts() {
    client.get("/share-outs/").then((res) => setShareOuts(res.data));
  }

  useEffect(() => {
    client.get("/members/").then((res) => setMembers(res.data));
    loadShareOuts();
  }, []);

  async function computeShareOut() {
    if (!openCycle) return;
    setMessage(null);
    setComputing(true);
    try {
      const res = await client.post(`/cycles/${openCycle.id}/share_out/`);
      setMessage({ type: "success", text: "Share-out computed." });
      setShareOuts((prev) => [...prev, res.data]);
      reloadCycles();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.[0] || "Could not compute share-out." });
    } finally {
      setComputing(false);
    }
  }

  function memberName(id) {
    return members.find((m) => m.id === id)?.full_name || `#${id}`;
  }

  return (
    <div>
      <h1 className="page-title">Share-out</h1>
      <p className="page-sub">Compute the end-of-cycle distribution. Total distributed always reconciles to the fund.</p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="ledger-card">
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
            <button className="btn btn-brass" onClick={computeShareOut} disabled={computing}>
              {computing ? "Computing\u2026" : "Compute share-out for this cycle"}
            </button>
          </>
        ) : (
          <p style={{ color: "var(--ink-soft)" }}>No open cycle.</p>
        )}
      </div>

      {shareOuts.map((so) => (
        <div className="ledger-card" key={so.id}>
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
                  <td>{memberName(d.member)}</td>
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
  );
}
