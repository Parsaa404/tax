import { useState, useEffect } from 'react';
import { transactionAPI, accountAPI } from '../api/services';
import { Plus, X, Ban } from 'lucide-react';

const fmt = (n) => `RM ${Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ transaction_type:'journal', transaction_date: new Date().toISOString().slice(0,10), description:'', reference:'', journal_lines:[
    { account_id:'', debit:'', credit:'', description:'' },
    { account_id:'', debit:'', credit:'', description:'' },
  ]});

  const load = async () => {
    setLoading(true);
    const [t, a] = await Promise.all([transactionAPI.list(), accountAPI.list()]);
    setTxns(t.data.data || []); setAccounts(a.data.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setLine = (i,k) => e => setForm(p => { const lines = [...p.journal_lines]; lines[i] = { ...lines[i], [k]: e.target.value }; return { ...p, journal_lines: lines }; });
  const addLine = () => setForm(p => ({ ...p, journal_lines: [...p.journal_lines, { account_id:'', debit:'', credit:'', description:'' }] }));
  const removeLine = i => setForm(p => ({ ...p, journal_lines: p.journal_lines.filter((_,idx)=>idx!==i) }));

  const totalDr = form.journal_lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  const totalCr = form.journal_lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try {
      const lines = form.journal_lines.map(l => ({ account_id:l.account_id, debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0, description:l.description }));
      const payload = { ...form, journal_lines: lines };
      
      // Handle the free-text reference by appending it to description to avoid Joi schema rejection
      if (payload.reference) {
         payload.description = `${payload.description} [Ref: ${payload.reference}]`;
      }
      delete payload.reference;

      await transactionAPI.create(payload);
      setShowModal(false); load();
    } catch(err) { setError(err.response?.data?.error || 'Failed to post transaction'); }
  };

  const handleVoid = async (id) => {
    if (!confirm('Void this transaction? This cannot be undone.')) return;
    await transactionAPI.void(id); load();
  };

  const TX_TYPES = { invoice:'chip-blue', payment:'chip-green', expense:'chip-gold', payroll:'chip-purple', journal:'chip-gray', tax:'chip-red' };

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Transactions</h1><p>Double-entry journal — all debits must equal credits</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14}/> Post Transaction</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th><th>Amount (Dr)</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}><div className="spinner-full"><div className="loading"/></div></td></tr>
              : txns.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><h4>No transactions yet</h4></div></td></tr>
              : txns.map(t => (
                <tr key={t.id} style={{ opacity: t.status==='void' ? 0.5 : 1 }}>
                  <td className="td-muted">{new Date(t.transaction_date).toLocaleDateString('en-MY')}</td>
                  <td><span className={`chip ${TX_TYPES[t.transaction_type]||'chip-gray'}`}>{t.transaction_type}</span></td>
                  <td style={{ fontWeight:500 }}>{t.description}</td>
                  <td className="td-muted td-mono">{t.reference || '—'}</td>
                  <td className="td-mono">{fmt(t.total_debit)}</td>
                  <td><span className={`chip ${t.status==='posted'?'chip-green':t.status==='void'?'chip-red':'chip-gray'}`}>{t.status}</span></td>
                  <td>{t.status === 'posted' && <button className="btn btn-ghost btn-sm" onClick={() => handleVoid(t.id)}><Ban size={14}/></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Post Journal Entry</h3><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Type</label>
                    <select className="form-control" value={form.transaction_type} onChange={e => setForm(p=>({...p,transaction_type:e.target.value}))}>
                      {['journal','invoice','payment','expense','payroll','tax'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" required value={form.transaction_date} onChange={e=>setForm(p=>({...p,transaction_date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Description *</label><input className="form-control" required placeholder="Payment received for consulting" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Reference</label><input className="form-control" placeholder="INV-001" value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} /></div>
                </div>

                <label className="form-label mb-2">Journal Lines</label>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', marginBottom:8 }}>
                    <thead><tr>
                      <th style={{ padding:'6px 8px', textAlign:'left', fontSize:'0.72rem', color:'var(--text-muted)' }}>Account</th>
                      <th style={{ padding:'6px 8px', textAlign:'left', fontSize:'0.72rem', color:'var(--text-muted)' }}>Debit (RM)</th>
                      <th style={{ padding:'6px 8px', textAlign:'left', fontSize:'0.72rem', color:'var(--text-muted)' }}>Credit (RM)</th>
                      <th style={{ padding:'6px 8px', textAlign:'left', fontSize:'0.72rem', color:'var(--text-muted)' }}>Narration</th>
                      <th />
                    </tr></thead>
                    <tbody>
                      {form.journal_lines.map((line,i) => (
                        <tr key={i}>
                          <td style={{ padding:'4px 8px' }}>
                            <select className="form-control" required value={line.account_id} onChange={setLine(i,'account_id')}>
                              <option value="">— Select account —</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding:'4px 8px' }}><input className="form-control" type="number" min="0" step="0.01" placeholder="0.00" value={line.debit} onChange={setLine(i,'debit')} style={{ width:110 }} /></td>
                          <td style={{ padding:'4px 8px' }}><input className="form-control" type="number" min="0" step="0.01" placeholder="0.00" value={line.credit} onChange={setLine(i,'credit')} style={{ width:110 }} /></td>
                          <td style={{ padding:'4px 8px' }}><input className="form-control" placeholder="Narration" value={line.description} onChange={setLine(i,'description')} /></td>
                          <td style={{ padding:'4px 8px' }}>{form.journal_lines.length > 2 && <button type="button" className="btn-icon" onClick={() => removeLine(i)}><X size={14}/></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={addLine}><Plus size={12}/> Add Line</button>
                <div style={{ marginTop:16, display:'flex', gap:24, justifyContent:'flex-end', fontSize:'0.85rem' }}>
                  <span>Total Debit: <strong style={{ color:'var(--accent-2)' }}>{fmt(totalDr)}</strong></span>
                  <span>Total Credit: <strong style={{ color:'var(--accent)' }}>{fmt(totalCr)}</strong></span>
                  {Math.abs(totalDr - totalCr) > 0.01 && <span style={{ color:'var(--accent-danger)' }}>⚠ Unbalanced by {fmt(Math.abs(totalDr-totalCr))}</span>}
                  {Math.abs(totalDr - totalCr) <= 0.01 && totalDr > 0 && <span style={{ color:'var(--accent)' }}>✓ Balanced</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={Math.abs(totalDr-totalCr)>0.01}><Plus size={14}/> Post Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
