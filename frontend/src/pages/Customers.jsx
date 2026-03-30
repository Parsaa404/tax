import { useState, useEffect } from 'react';
import { customerAPI } from '../api/services';
import { Plus, X, Pencil, Mail, Phone, MapPin } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    registration_number: '',
    tax_number: '',
    email: '',
    phone: '',
    address: '',
    country: 'MY'
  });

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.list();
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', registration_number: '', tax_number: '', email: '', phone: '', address: '', country: 'MY' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || '',
      registration_number: customer.registration_number || '',
      tax_number: customer.tax_number || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      country: customer.country || 'MY'
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      // Map empty strings to null for Joi validation compatibility
      ['registration_number', 'tax_number', 'email', 'phone', 'address'].forEach(k => {
        if (!payload[k]) payload[k] = null;
      });

      if (editingId) {
        await customerAPI.update(editingId, payload);
      } else {
        await customerAPI.create(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer');
    }
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Customers</h1>
          <p>Manage your clients and their tax information for e-Invoicing</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={14} /> Add Customer
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>Registration No.</th>
                <th>Tax No. (TIN)</th>
                <th>Country</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><div className="spinner-full"><div className="loading" /></div></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><h4>No customers yet</h4><p>Add your first customer to start invoicing.</p></div></td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
                        {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}><Mail size={12}/> {c.email}</div>}
                        {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}><Phone size={12}/> {c.phone}</div>}
                      </div>
                    </td>
                    <td className="td-mono td-muted">{c.registration_number || '—'}</td>
                    <td className="td-mono td-muted">{c.tax_number || '—'}</td>
                    <td><span className="chip chip-gray">{c.country}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                        <Pencil size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                
                <div className="form-grid mb-4">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Company / Individual Name *</label>
                    <input className="form-control" required placeholder="Acme Corp Sdn Bhd" value={form.name} onChange={set('name')} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Registration No. (SSM)</label>
                    <input className="form-control" placeholder="1234567-X" value={form.registration_number} onChange={set('registration_number')} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Tax Identification No. (TIN)</label>
                    <input className="form-control" placeholder="C1234567890" value={form.tax_number} onChange={set('tax_number')} />
                    <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4, display: 'block' }}>Required for LHDN e-Invoicing</span>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-control" type="email" placeholder="billing@acme.com" value={form.email} onChange={set('email')} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" placeholder="+60 12-345 6789" value={form.phone} onChange={set('phone')} />
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label className="form-label">Billing Address</label>
                  <input className="form-control" placeholder="123 Jalan Ampang, 50450 Kuala Lumpur" value={form.address} onChange={set('address')} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Country Code</label>
                  <input className="form-control" placeholder="MY" maxLength={2} value={form.country} onChange={set('country')} style={{ width: 100 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
