import { useState, useEffect } from 'react';
import { expenseAPI, accountAPI } from '../api/services';
import { Plus, X, CheckCircle } from 'lucide-react';

const fmt = (n) => `RM ${Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ expense_date: new Date().toISOString().slice(0,10), description:'', amount:'', category:'operating', vendor_name:'', account_id:'', is_tax_deductible: true, receipt_number:'' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type==='checkbox' ? e.target.checked : e.target.value }));

  const load = async () => {
    setLoading(true);
    const [exp, acc] = await Promise.all([expenseAPI.list(), accountAPI.list()]);
    setExpenses(exp.data.data || []); setAccounts(acc.data.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (!payload.account_id) payload.account_id = null;
      await expenseAPI.create(payload);
      setShowModal(false); setForm({ expense_date: new Date().toISOString().slice(0,10), description:'', amount:'', category:'operating', vendor_name:'', account_id:'', is_tax_deductible: true, receipt_number:'' });
      load();
    } catch(err) { setError(err.response?.data?.error || 'Failed to record expense'); }
  };

  const handleApprove = async (id) => { await expenseAPI.approve(id); load(); };

  const CATS = ['operating','cogs','admin','marketing','travel','utilities','rent','professional_fees','depreciation','other'];

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Expenses</h1><p>Track business expenses and tax deductibility</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14}/> Record Expense</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Tax Deductible</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="spinner-full"><div className="loading"/></div></td></tr>
              : expenses.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><h4>No expenses yet</h4></div></td></tr>
              : expenses.map(e => (
                <tr key={e.id}>
                  <td className="td-muted">{new Date(e.expense_date).toLocaleDateString('en-MY')}</td>
                  <td style={{ fontWeight:500 }}>{e.description}</td>
                  <td className="td-muted">{e.vendor_name || '—'}</td>
                  <td><span className="chip chip-gray">{e.category}</span></td>
                  <td className="td-mono">{fmt(e.amount)}</td>
                  <td><span className={`chip ${e.is_tax_deductible ? 'chip-green' : 'chip-gray'}`}>{e.is_tax_deductible ? 'Yes' : 'No'}</span></td>
                  <td><span className={`chip ${e.status==='approved'?'chip-green':e.status==='rejected'?'chip-red':'chip-gold'}`}>{e.status}</span></td>
                  <td>{e.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => handleApprove(e.id)}><CheckCircle size={12}/> Approve</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Record Expense</h3><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" required value={form.expense_date} onChange={set('expense_date')} /></div>
                  <div className="form-group"><label className="form-label">Amount (RM) *</label><input className="form-control" type="number" required placeholder="1500.00" value={form.amount} onChange={set('amount')} /></div>
                  <div className="form-group"><label className="form-label">Description *</label><input className="form-control" required placeholder="Describe the expense" value={form.description} onChange={set('description')} /></div>
                  <div className="form-group"><label className="form-label">Vendor</label><input className="form-control" placeholder="Vendor name" value={form.vendor_name} onChange={set('vendor_name')} /></div>
                  <div className="form-group"><label className="form-label">Category *</label>
                    <select className="form-control" value={form.category} onChange={set('category')}>
                      {CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">GL Account</label>
                    <select className="form-control" value={form.account_id} onChange={set('account_id')}>
                      <option value="">— Auto select —</option>
                      {accounts.filter(a => a.account_type === 'expense').map(a => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Receipt No.</label><input className="form-control" placeholder="REC-001" value={form.receipt_number} onChange={set('receipt_number')} /></div>
                </div>
                <label style={{ display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:'0.85rem' }}>
                  <input type="checkbox" checked={form.is_tax_deductible} onChange={set('is_tax_deductible')} />
                  Tax deductible (Section 33, ITA 1967)
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14}/> Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
