import { useState, useEffect } from 'react';
import { invoiceAPI, customerAPI, einvoiceAPI } from '../api/services';
import { Plus, Send, Eye, CheckCircle, X } from 'lucide-react';

const fmt = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_CHIP = { draft:'chip-gray', sent:'chip-blue', paid:'chip-green', cancelled:'chip-red', void:'chip-red' };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewInv, setViewInv] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customer_id:'', invoice_number:`INV-${Date.now()}`, issue_date: new Date().toISOString().slice(0,10), due_date:'', tax_type:'SST', items:[{ description:'', quantity:1, unit_price:'' }] });

  const load = async () => {
    setLoading(true);
    const [inv, cust] = await Promise.all([invoiceAPI.list(), customerAPI.list()]);
    setInvoices(inv.data.data || []);
    setCustomers(cust.data.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { description:'', quantity:1, unit_price:'' }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_,idx) => idx !== i) }));
  const setItem = (i, k) => e => setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: e.target.value }; return { ...p, items }; });

  const subtotal = form.items.reduce((s, it) => s + (parseFloat(it.quantity)||0) * (parseFloat(it.unit_price)||0), 0);
  const sst = form.tax_type === 'SST' ? subtotal * 0.08 : 0;
  const total = subtotal + sst;

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, items: form.items.map(it => ({ ...it, quantity: parseFloat(it.quantity), unit_price: parseFloat(it.unit_price) })) };
      if (!payload.due_date) payload.due_date = null;
      await invoiceAPI.create(payload);
      setShowCreate(false);
      setForm({ customer_id:'', invoice_number:`INV-${Date.now()}`, issue_date: new Date().toISOString().slice(0,10), due_date:'', tax_type:'SST', items:[{ description:'', quantity:1, unit_price:'' }] });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create invoice'); }
  };

  const handleStatusChange = async (id, status) => {
    await invoiceAPI.updateStatus(id, status);
    load();
    if (viewInv?.id === id) setViewInv(p => ({ ...p, status }));
  };

  const handleSubmitEinvoice = async (id) => {
    try {
      await einvoiceAPI.submit(id);
      load();
    } catch (err) { alert(err.response?.data?.error || 'e-Invoice submission failed'); }
  };

  const viewDetails = async (inv) => {
    const res = await invoiceAPI.get(inv.id);
    setViewInv(res.data.data);
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Invoices</h1><p>Issue invoices and submit e-Invoices to LHDN MyInvois</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> New Invoice</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice No.</th><th>Customer</th><th>Issue Date</th><th>Due Date</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th>e-Invoice</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10}><div className="spinner-full"><div className="loading"/></div></td></tr>
              : invoices.length === 0 ? <tr><td colSpan={10}><div className="empty-state"><h4>No invoices yet</h4><p>Create your first invoice.</p></div></td></tr>
              : invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-2)' }}>{inv.invoice_number}</td>
                  <td>{inv.customer_name}</td>
                  <td className="td-muted">{new Date(inv.issue_date).toLocaleDateString('en-MY')}</td>
                  <td className="td-muted">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-MY') : '—'}</td>
                  <td className="td-mono">{fmt(inv.subtotal)}</td>
                  <td className="td-mono td-muted">{fmt(inv.tax_amount)}</td>
                  <td className="td-mono" style={{ fontWeight: 600 }}>{fmt(inv.total_amount)}</td>
                  <td><span className={`chip ${STATUS_CHIP[inv.status] || 'chip-gray'}`}>{inv.status}</span></td>
                  <td>
                    {inv.einvoice_status === 'valid' ? <span className="chip chip-green">Valid</span>
                    : inv.einvoice_status === 'pending' ? <span className="chip chip-gold">Pending</span>
                    : inv.status === 'draft' ? '—'
                    : <button className="btn btn-blue btn-sm" onClick={() => handleSubmitEinvoice(inv.id)}><Send size={12} /> Submit</button>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewDetails(inv)}><Eye size={14} /></button>
                      {inv.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(inv.id, 'sent')}>Send</button>}
                      {inv.status === 'sent'  && <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(inv.id, 'paid')}><CheckCircle size={12} /> Paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>New Invoice</h3><button className="btn-icon" onClick={() => setShowCreate(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Customer *</label>
                    <select className="form-control" required value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                      <option value="">— Select customer —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Invoice No. *</label>
                    <input className="form-control" required value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Issue Date *</label>
                    <input className="form-control" type="date" required value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Due Date</label>
                    <input className="form-control" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Tax Type</label>
                    <select className="form-control" value={form.tax_type} onChange={e => setForm(p => ({ ...p, tax_type: e.target.value }))}>
                      <option value="SST">SST (8%)</option><option value="none">No Tax</option>
                    </select>
                  </div>
                </div>

                {/* Line items */}
                <label className="form-label mb-2">Line Items</label>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 30px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="form-control" placeholder="Description" value={item.description} onChange={setItem(i,'description')} required />
                    <input className="form-control" type="number" placeholder="Qty" value={item.quantity} onChange={setItem(i,'quantity')} min="0.01" step="0.01" required />
                    <input className="form-control" type="number" placeholder="Unit Price" value={item.unit_price} onChange={setItem(i,'unit_price')} min="0" step="0.01" required />
                    {form.items.length > 1 && <button type="button" className="btn-icon" onClick={() => removeItem(i)}><X size={16}/></button>}
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm mt-2" onClick={addItem}><Plus size={12}/> Add Line</button>

                <div style={{ marginTop: 20, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex-between mb-2"><span className="text-muted">Subtotal</span><span className="td-mono">{fmt(subtotal)}</span></div>
                  <div className="flex-between mb-2"><span className="text-muted">SST (8%)</span><span className="td-mono">{fmt(sst)}</span></div>
                  <div className="flex-between" style={{ fontWeight: 700, fontSize: '1rem' }}><span>Total</span><span style={{ color: 'var(--accent)' }}>{fmt(total)}</span></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14}/> Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInv && (
        <div className="modal-overlay" onClick={() => setViewInv(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{viewInv.invoice_number}</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`chip ${STATUS_CHIP[viewInv.status]}`}>{viewInv.status}</span>
                <button className="btn-icon" onClick={() => setViewInv(null)}><X size={18}/></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="form-grid mb-4">
                <div><span className="form-label">Customer</span><p style={{ marginTop: 4 }}>{viewInv.customer_name}</p></div>
                <div><span className="form-label">Issue Date</span><p style={{ marginTop: 4 }}>{new Date(viewInv.issue_date).toLocaleDateString('en-MY')}</p></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {(viewInv.items || []).map(item => (
                      <tr key={item.id}>
                        <td className="td-muted">{item.line_number}</td>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td className="td-mono">{fmt(item.unit_price)}</td>
                        <td className="td-mono">{fmt(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', maxWidth: 300, marginLeft: 'auto' }}>
                <div className="flex-between mb-2"><span className="text-muted">Subtotal</span><span>{fmt(viewInv.subtotal)}</span></div>
                <div className="flex-between mb-2"><span className="text-muted">SST ({viewInv.tax_rate}%)</span><span>{fmt(viewInv.tax_amount)}</span></div>
                <div className="flex-between" style={{ fontWeight: 700, fontSize: '1.05rem' }}><span>Total</span><span style={{ color: 'var(--accent)' }}>{fmt(viewInv.total_amount)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              {viewInv.status === 'sent' && !viewInv.einvoice_id && (
                <button className="btn btn-blue" onClick={() => { handleSubmitEinvoice(viewInv.id); setViewInv(null); }}><Send size={14}/> Submit e-Invoice</button>
              )}
              {viewInv.status === 'sent' && <button className="btn btn-primary" onClick={() => handleStatusChange(viewInv.id, 'paid')}><CheckCircle size={14}/> Mark Paid</button>}
              <button className="btn btn-outline" onClick={() => setViewInv(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
