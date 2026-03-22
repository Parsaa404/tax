import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { companyAPI } from '../api/services';
import { Save, Building2 } from 'lucide-react';

export default function Settings() {
  const { company, setCompany, user } = useAuth();
  const [form, setForm] = useState({ name: company?.name||'', registration_number: company?.registration_number||'', tax_number: company?.tax_number||'', company_type: company?.company_type||'Sdn Bhd', paid_up_capital: company?.paid_up_capital||0, address: company?.address||'', phone: company?.phone||'', email: company?.email||'', financial_year_end: company?.financial_year_end||12 });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault(); setSuccess(''); setError(''); setLoading(true);
    try {
      const res = await companyAPI.update(form);
      setCompany(res.data.data);
      localStorage.setItem('mytax_company', JSON.stringify(res.data.data));
      setSuccess('Company profile updated successfully.');
    } catch(err) { setError(err.response?.data?.error || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1>Settings</h1><p>Manage your company profile and preferences</p></div>

      <div className="grid-65-35">
        <div className="card">
          <div className="card-header"><h3 style={{ display:'flex', gap:8, alignItems:'center' }}><Building2 size={16}/> Company Profile</h3></div>
          <div className="card-body">
            {success && <div className="alert alert-success mb-4">{success}</div>}
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-grid mb-4">
                <div className="form-group"><label className="form-label">Company Name *</label><input className="form-control" required value={form.name} onChange={set('name')} /></div>
                <div className="form-group"><label className="form-label">SSM Reg. No.</label><input className="form-control" placeholder="1234567-A" value={form.registration_number} onChange={set('registration_number')} /></div>
                <div className="form-group"><label className="form-label">Tax No. (TIN)</label><input className="form-control" placeholder="C12345678" value={form.tax_number} onChange={set('tax_number')} /></div>
                <div className="form-group"><label className="form-label">Company Type</label>
                  <select className="form-control" value={form.company_type} onChange={set('company_type')}>
                    {['Sdn Bhd','LLC','Sole Prop','Partnership','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Paid-up Capital (RM)</label><input className="form-control" type="number" value={form.paid_up_capital} onChange={set('paid_up_capital')} /></div>
                <div className="form-group"><label className="form-label">Financial Year End</label>
                  <select className="form-control" value={form.financial_year_end} onChange={set('financial_year_end')}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{new Date(2024, m-1, 1).toLocaleString('en',{month:'long'})}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={set('email')} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-control" placeholder="+60 3-XXXX XXXX" value={form.phone} onChange={set('phone')} /></div>
              </div>
              <div className="form-group mb-4"><label className="form-label">Address</label><input className="form-control" placeholder="Full business address" value={form.address} onChange={set('address')} /></div>
              <button className="btn btn-primary" type="submit" disabled={loading}><Save size={14}/> {loading ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>
        </div>

        {/* Info panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-header"><h3>Your Account</h3></div>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:52, height:52, background:'var(--gradient-blue)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'1.3rem', color:'white' }}>{user?.name?.[0]||'U'}</div>
                <div><div style={{ fontWeight:600 }}>{user?.name}</div><div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{user?.email}</div></div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div className="flex-between" style={{ fontSize:'0.85rem' }}><span className="text-muted">Role</span><span className="chip chip-blue">{user?.role}</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>SME Status</h3></div>
            <div className="card-body">
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:8 }}>{company?.is_sme ? '✅' : '❌'}</div>
                <div style={{ fontWeight:700, fontSize:'1.1rem' }}>{company?.is_sme ? 'SME Qualified' : 'Non-SME'}</div>
                <div style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginTop:8, lineHeight:1.6 }}>
                  {company?.is_sme
                    ? 'Your company qualifies for SME tiered CIT rates: 15% / 17% / 24%'
                    : 'Standard CIT rate of 24% applies (paid-up capital > RM2.5M)'}
                </div>
              </div>
              <div style={{ marginTop:8, padding:12, background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', fontSize:'0.78rem', color:'var(--text-muted)' }}>
                Paid-up Capital: <strong style={{ color:'var(--text-primary)' }}>RM {Number(company?.paid_up_capital||0).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
