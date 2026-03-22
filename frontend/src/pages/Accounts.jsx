import { useState, useEffect } from 'react';
import { accountAPI } from '../api/services';
import { Plus, X, ChevronRight } from 'lucide-react';

const TYPE_CHIP = { asset:'chip-blue', liability:'chip-red', equity:'chip-green', revenue:'chip-purple', expense:'chip-gold', cogs:'chip-gold' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ account_code:'', account_name:'', account_type:'asset', parent_id:'', description:'' });
  const [error, setError] = useState('');
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => { setLoading(true); const res = await accountAPI.list(); setAccounts(res.data.data || []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try { await accountAPI.create(form); setShowModal(false); setForm({ account_code:'', account_name:'', account_type:'asset', parent_id:'', description:'' }); load(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create account'); }
  };

  // Group by type
  const grouped = accounts.reduce((g, a) => { (g[a.account_type] = g[a.account_type] || []).push(a); return g; }, {});
  const types = ['asset','liability','equity','revenue','expense','cogs'];
  const typeLabels = { asset:'Assets', liability:'Liabilities', equity:'Equity', revenue:'Revenue', expense:'Expenses', cogs:'Cost of Goods Sold' };

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Chart of Accounts</h1><p>Double-entry bookkeeping account structure</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14}/> New Account</button>
      </div>

      {loading ? <div className="spinner-full"><div className="loading" style={{ width:32,height:32 }}/></div> :
        types.map(type => (grouped[type]?.length > 0) && (
          <div key={type} className="card mb-4">
            <div className="card-header">
              <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className={`chip ${TYPE_CHIP[type]}`}>{type}</span>
                {typeLabels[type]}
              </h3>
              <span className="text-muted" style={{ fontSize:'0.8rem' }}>{grouped[type].length} accounts</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Code</th><th>Account Name</th><th>Normal Balance</th><th>Level</th><th>Description</th></tr></thead>
                <tbody>
                  {(grouped[type] || []).sort((a,b)=>a.account_code.localeCompare(b.account_code)).map(acc => (
                    <tr key={acc.id}>
                      <td className="td-mono" style={{ color:'var(--accent-2)', fontWeight:600 }}>{acc.account_code}</td>
                      <td style={{ paddingLeft: acc.level > 1 ? `${acc.level * 16}px` : undefined }}>
                        {acc.level > 1 && <ChevronRight size={12} style={{ marginRight:4, opacity: 0.4 }} />}
                        {acc.account_name}
                      </td>
                      <td><span className={`chip ${acc.normal_balance === 'debit' ? 'chip-blue' : 'chip-red'}`}>{acc.normal_balance}</span></td>
                      <td className="td-muted">{acc.level}</td>
                      <td className="td-muted" style={{ fontSize:'0.8rem' }}>{acc.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      }

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>New Account</h3><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Account Code *</label><input className="form-control" required placeholder="1110" value={form.account_code} onChange={set('account_code')} /></div>
                  <div className="form-group"><label className="form-label">Account Name *</label><input className="form-control" required placeholder="Cash at Bank" value={form.account_name} onChange={set('account_name')} /></div>
                  <div className="form-group"><label className="form-label">Type *</label>
                    <select className="form-control" value={form.account_type} onChange={set('account_type')}>
                      {types.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Parent Account</label>
                    <select className="form-control" value={form.parent_id} onChange={set('parent_id')}>
                      <option value="">— Root (no parent) —</option>
                      {accounts.filter(a => a.account_type === form.account_type).map(a => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-control" placeholder="Optional description" value={form.description} onChange={set('description')} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14}/> Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
