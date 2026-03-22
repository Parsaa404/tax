import { useState, useEffect, useRef } from 'react';
import { reportAPI } from '../api/services';
import { Download, Printer } from 'lucide-react';

const fmt = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Reports() {
  const [tab, setTab] = useState('pl');
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to,   setTo]   = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  const loadReport = async () => {
    setLoading(true); setData(null);
    try {
      let res;
      if (tab === 'pl') res = await reportAPI.profitLoss({ from, to });
      else if (tab === 'bs') res = await reportAPI.balanceSheet({ as_at: to });
      else res = await reportAPI.trialBalance({ from, to });
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); }, [tab]);

  const print = () => window.print();

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Financial Reports</h1><p>Trial Balance, Profit & Loss, Balance Sheet</p></div>
        <button className="btn btn-outline" onClick={print}><Printer size={14}/> Print</button>
      </div>

      <div className="tabs">
        {[['pl','Profit & Loss'],['bs','Balance Sheet'],['tb','Trial Balance']].map(([k,l]) => (
          <button key={k} className={`tab-btn${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Date range */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'flex-end' }}>
        {tab !== 'bs' && <>
          <div className="form-group"><label className="form-label">From</label><input className="form-control" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width:160 }} /></div>
          <div className="form-group"><label className="form-label">To</label><input className="form-control" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width:160 }} /></div>
        </>}
        {tab === 'bs' && <div className="form-group"><label className="form-label">As At</label><input className="form-control" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width:160 }} /></div>}
        <button className="btn btn-primary" onClick={loadReport}>Generate</button>
      </div>

      {loading && <div className="spinner-full"><div className="loading" style={{ width:32, height:32 }}/></div>}

      {/* P&L */}
      {!loading && tab === 'pl' && data && (
        <div className="card">
          <div className="card-header">
            <h3>Statement of Profit & Loss</h3>
            <span className="text-muted" style={{ fontSize:'0.8rem' }}>{from} – {to}</span>
          </div>
          <div className="card-body">
            <ReportSection title="Revenue" items={data.revenue?.accounts || []} total={data.revenue?.total} color="green" />
            <ReportSection title="Cost of Goods Sold" items={data.cost_of_sales?.accounts || []} total={data.cost_of_sales?.total} color="red" />
            <GrossProfit label="Gross Profit" value={(parseFloat(data.revenue?.total||0)) - (parseFloat(data.cost_of_sales?.total||0))} />
            <ReportSection title="Operating Expenses" items={data.expenses?.accounts || []} total={data.expenses?.total} color="red" />
            <div className="separator" />
            <div className="flex-between" style={{ fontWeight:700, fontSize:'1.1rem', padding:'8px 0' }}>
              <span>Net Profit / (Loss)</span>
              <span style={{ color: parseFloat(data.net_profit)>=0 ? 'var(--accent)' : 'var(--accent-danger)' }}>{fmt(data.net_profit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {!loading && tab === 'bs' && data && (
        <div className="card">
          <div className="card-header"><h3>Balance Sheet</h3><span className="text-muted" style={{ fontSize:'0.8rem' }}>As at {to}</span></div>
          <div className="card-body">
            <ReportSection title="Assets" items={data.assets?.accounts || []} total={data.assets?.total} color="blue" />
            <ReportSection title="Liabilities" items={data.liabilities?.accounts || []} total={data.liabilities?.total} color="red" />
            <ReportSection title="Equity" items={data.equity?.accounts || []} total={data.equity?.total} color="green" />
            <div className="separator" />
            <div className="flex-between" style={{ fontWeight:700, fontSize:'0.9rem' }}>
              <span>Liabilities + Equity</span>
              <span>{fmt((parseFloat(data.liabilities?.total||0)) + (parseFloat(data.equity?.total||0)))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance */}
      {!loading && tab === 'tb' && data && (
        <div className="card">
          <div className="card-header"><h3>Trial Balance</h3>
            <span className={`chip ${data.totals?.balanced ? 'chip-green' : 'chip-red'}`}>{data.totals?.balanced ? '✓ Balanced' : '✕ Unbalanced'}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Account Code</th><th>Account Name</th><th>Type</th><th className="td-right">Debit (RM)</th><th className="td-right">Credit (RM)</th></tr></thead>
              <tbody>
                {(data.accounts || []).map(a => (
                  <tr key={a.id}>
                    <td className="td-mono td-muted">{a.account_code}</td>
                    <td>{a.account_name}</td>
                    <td><span className="chip chip-gray">{a.account_type}</span></td>
                    <td className="td-right td-mono">{parseFloat(a.debit||0) > 0 ? fmt(a.debit) : '—'}</td>
                    <td className="td-right td-mono">{parseFloat(a.credit||0) > 0 ? fmt(a.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'var(--bg-elevated)', fontWeight:700 }}>
                  <td colSpan={3} style={{ padding:'12px 16px' }}>Totals</td>
                  <td className="td-right td-mono" style={{ padding:'12px 16px' }}>{fmt(data.totals?.total_debit)}</td>
                  <td className="td-right td-mono" style={{ padding:'12px 16px' }}>{fmt(data.totals?.total_credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSection({ title, items, total, color }) {
  const colors = { green:'var(--accent)', red:'var(--accent-danger)', blue:'var(--accent-2)' };
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', padding:'10px 0 6px' }}>{title}</div>
      {(items || []).map(a => (
        <div key={a.account_code} className="flex-between" style={{ padding:'6px 12px', borderBottom:'1px solid var(--border-subtle)' }}>
          <div><span className="td-mono td-muted" style={{ fontSize:'0.72rem', marginRight:10 }}>{a.account_code}</span>{a.account_name}</div>
          <span className="td-mono">{fmt(a.balance)}</span>
        </div>
      ))}
      <div className="flex-between" style={{ padding:'8px 12px', fontWeight:700, borderTop:'1px solid var(--border)' }}>
        <span>Total {title}</span>
        <span style={{ color: colors[color] }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

function GrossProfit({ label, value }) {
  return (
    <div className="flex-between" style={{ padding:'8px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', marginBottom:16, fontWeight:600 }}>
      <span>{label}</span>
      <span style={{ color: value>=0 ? 'var(--accent)' : 'var(--accent-danger)' }}>{fmt(value)}</span>
    </div>
  );
}
