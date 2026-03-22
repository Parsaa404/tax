import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../api/services';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    company_name: '', registration_number: '',
    company_type: 'Sdn Bhd', paid_up_capital: '', financial_year_end: '12',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form, paid_up_capital: parseFloat(form.paid_up_capital) || 0, financial_year_end: parseInt(form.financial_year_end) };
      const res = await authAPI.register(payload);
      login(res.data.user, res.data.company, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <div className="logo-icon">MY</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>MYTax</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Malaysian Tax & Accounting</div>
          </div>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Get started with MYTax for your business</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-divider" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', position: 'relative' }}>
            <span style={{ background: 'var(--bg-surface)', padding: '0 10px', position: 'relative', zIndex: 1 }}>Personal Details</span>
            <div style={{ height: 1, background: 'var(--border)', position: 'absolute', top: '50%', left: 0, right: 0, zIndex: 0 }} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full name *</label>
              <input className="form-control" required placeholder="Ahmad bin Ali" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-control" type="email" required placeholder="you@company.com" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-control" type="password" required placeholder="Min 8 characters" value={form.password} onChange={set('password')} />
          </div>

          <div className="auth-divider" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', position: 'relative', marginTop: 4 }}>
            <span style={{ background: 'var(--bg-surface)', padding: '0 10px', position: 'relative', zIndex: 1 }}>Company Details</span>
            <div style={{ height: 1, background: 'var(--border)', position: 'absolute', top: '50%', left: 0, right: 0, zIndex: 0 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Company name *</label>
            <input className="form-control" required placeholder="Syarikat Sdn Bhd" value={form.company_name} onChange={set('company_name')} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">SSM Reg. No.</label>
              <input className="form-control" placeholder="1234567-A" value={form.registration_number} onChange={set('registration_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">Company type</label>
              <select className="form-control" value={form.company_type} onChange={set('company_type')}>
                {['Sdn Bhd', 'LLC', 'Sole Prop', 'Partnership', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Paid-up capital (RM)</label>
              <input className="form-control" type="number" placeholder="500000" value={form.paid_up_capital} onChange={set('paid_up_capital')} />
            </div>
            <div className="form-group">
              <label className="form-label">Financial year end</label>
              <select className="form-control" value={form.financial_year_end} onChange={set('financial_year_end')}>
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(m => (
                  <option key={m} value={m}>{new Date(2024, parseInt(m)-1, 1).toLocaleString('en',{month:'long'})}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
