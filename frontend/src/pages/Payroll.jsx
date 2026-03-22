import { useState, useEffect } from 'react';
import { payrollAPI } from '../api/services';
import { Plus, Play, CheckCircle, Eye, X } from 'lucide-react';

const fmt = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Payroll() {
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showRunView, setShowRunView] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ name:'', date_of_birth:'', employment_date:'', basic_salary:'', epf_number:'', ic_number:'', is_muslim:false, spouse_status:0, num_children:0, is_foreign:false });
  const [runForm, setRunForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [emp, r] = await Promise.all([payrollAPI.listEmployees(), payrollAPI.listRuns()]);
    setEmployees(emp.data.data || []);
    setRuns(r.data.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleCreateEmp = async (e) => {
    e.preventDefault(); setError('');
    try {
      await payrollAPI.createEmployee({ ...form, basic_salary: parseFloat(form.basic_salary), spouse_status: parseInt(form.spouse_status), num_children: parseInt(form.num_children) });
      setShowModal(false); setForm({ name:'', date_of_birth:'', employment_date:'', basic_salary:'', epf_number:'', ic_number:'', is_muslim:false, spouse_status:0, num_children:0, is_foreign:false });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create employee'); }
  };

  const handleRunPayroll = async (e) => {
    e.preventDefault(); setError('');
    try {
      await payrollAPI.run({ year: parseInt(runForm.year), month: parseInt(runForm.month) });
      setShowRunModal(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Payroll run failed'); }
  };

  const viewRun = async (id) => {
    const res = await payrollAPI.getRun(id);
    setShowRunView(res.data.data);
  };

  const approveRun = async (id) => {
    await payrollAPI.approveRun(id);
    load();
    if (showRunView?.id === id) setShowRunView(p => ({ ...p, status: 'approved' }));
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Payroll</h1><p>EPF, SOCSO, EIS, PCB & Zakat computation for Malaysian employees</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setShowRunModal(true)}><Play size={14} /> Run Payroll</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> Add Employee</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'employees' ? ' active' : ''}`} onClick={() => setTab('employees')}>Employees ({employees.length})</button>
        <button className={`tab-btn${tab === 'runs' ? ' active' : ''}`} onClick={() => setTab('runs')}>Payroll Runs ({runs.length})</button>
      </div>

      {/* Employees */}
      {tab === 'employees' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>IC/Passport</th><th>Basic Salary</th><th>EPF No.</th><th>Religion</th><th>Status</th></tr></thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><h4>No employees yet</h4><p>Add your first employee to get started.</p></div></td></tr>
                ) : employees.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td className="td-muted td-mono">{e.ic_number || '—'}</td>
                    <td className="td-mono">{fmt(e.basic_salary)}</td>
                    <td className="td-muted td-mono">{e.epf_number || '—'}</td>
                    <td><span className={`chip ${e.is_muslim ? 'chip-green' : 'chip-gray'}`}>{e.is_muslim ? 'Muslim' : 'Non-Muslim'}</span></td>
                    <td><span className={`chip ${e.employment_status === 'active' ? 'chip-green' : 'chip-red'}`}>{e.employment_status || 'active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Runs */}
      {tab === 'runs' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Period</th><th>Processed</th><th>Total Gross</th><th>Total Net</th><th>Employer Cost</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><h4>No payroll runs yet</h4></div></td></tr>
                ) : runs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{MONTHS[(r.month || 1) - 1]} {r.year}</td>
                    <td className="td-muted">{r.processed_count} employees</td>
                    <td className="td-mono">{fmt(r.total_gross)}</td>
                    <td className="td-mono">{fmt(r.total_net)}</td>
                    <td className="td-mono text-gold">{fmt(r.total_employer_cost)}</td>
                    <td><span className={`chip ${r.status === 'approved' ? 'chip-green' : 'chip-gold'}`}>{r.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => viewRun(r.id)}><Eye size={14} /></button>
                        {r.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => approveRun(r.id)}><CheckCircle size={14} /> Approve</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Employee</h3><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleCreateEmp}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" required placeholder="Ahmad bin Ali" value={form.name} onChange={set('name')} /></div>
                  <div className="form-group"><label className="form-label">IC No. / Passport</label><input className="form-control" placeholder="880515-XX-XXXX" value={form.ic_number} onChange={set('ic_number')} /></div>
                  <div className="form-group"><label className="form-label">Date of Birth *</label><input className="form-control" type="date" required value={form.date_of_birth} onChange={set('date_of_birth')} /></div>
                  <div className="form-group"><label className="form-label">Employment Date *</label><input className="form-control" type="date" required value={form.employment_date} onChange={set('employment_date')} /></div>
                  <div className="form-group"><label className="form-label">Basic Salary (RM) *</label><input className="form-control" type="number" required placeholder="5000" value={form.basic_salary} onChange={set('basic_salary')} /></div>
                  <div className="form-group"><label className="form-label">EPF Number</label><input className="form-control" placeholder="A-12345678-9" value={form.epf_number} onChange={set('epf_number')} /></div>
                  <div className="form-group"><label className="form-label">Spouse Status</label>
                    <select className="form-control" value={form.spouse_status} onChange={set('spouse_status')}><option value="0">Single/Divorced</option><option value="1">Married (Spouse not working)</option><option value="2">Married (Spouse working)</option></select></div>
                  <div className="form-group"><label className="form-label">No. of Children</label><input className="form-control" type="number" min="0" value={form.num_children} onChange={set('num_children')} /></div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}><input type="checkbox" checked={form.is_muslim} onChange={set('is_muslim')} /> Muslim (Zakat eligible)</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}><input type="checkbox" checked={form.is_foreign} onChange={set('is_foreign')} /> Foreign worker</label>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary"><Plus size={14} /> Add Employee</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Run Payroll Modal */}
      {showRunModal && (
        <div className="modal-overlay" onClick={() => setShowRunModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3>Run Payroll</h3><button className="btn-icon" onClick={() => setShowRunModal(false)}><X size={18} /></button></div>
            <form onSubmit={handleRunPayroll}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Year</label><input className="form-control" type="number" value={runForm.year} onChange={e => setRunForm(p => ({ ...p, year: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Month</label>
                    <select className="form-control" value={runForm.month} onChange={e => setRunForm(p => ({ ...p, month: e.target.value }))}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="alert alert-info mt-4">This will calculate EPF, SOCSO, EIS, PCB and Zakat for all {employees.length} active employee(s).</div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowRunModal(false)}>Cancel</button><button type="submit" className="btn btn-primary"><Play size={14} /> Run Payroll</button></div>
            </form>
          </div>
        </div>
      )}

      {/* View Payroll Run Modal */}
      {showRunView && (
        <div className="modal-overlay" onClick={() => setShowRunView(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payroll — {MONTHS[(showRunView.month || 1) - 1]} {showRunView.year}</h3>
              <button className="btn-icon" onClick={() => setShowRunView(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
                <div className="kpi-card green" style={{ padding: 16 }}><div className="kpi-label">Total Gross</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{fmt(showRunView.total_gross)}</div></div>
                <div className="kpi-card blue" style={{ padding: 16 }}><div className="kpi-label">Total Net Pay</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{fmt(showRunView.total_net)}</div></div>
                <div className="kpi-card gold" style={{ padding: 16 }}><div className="kpi-label">Employer Cost</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{fmt(showRunView.total_employer_cost)}</div></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Employee</th><th>Gross</th><th>EPF Emp.</th><th>SOCSO</th><th>PCB</th><th>Net Pay</th></tr></thead>
                  <tbody>
                    {(showRunView.items || []).map(i => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600 }}>{i.employee_name}</td>
                        <td className="td-mono">{fmt(i.gross_salary)}</td>
                        <td className="td-mono td-muted">{fmt(i.epf_employee)}</td>
                        <td className="td-mono td-muted">{fmt(i.socso_employee)}</td>
                        <td className="td-mono td-muted">{fmt(i.pcb)}</td>
                        <td className="td-mono text-green">{fmt(i.net_salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              {showRunView.status === 'draft' && <button className="btn btn-primary" onClick={() => approveRun(showRunView.id)}><CheckCircle size={14} /> Approve Payroll</button>}
              <button className="btn btn-outline" onClick={() => setShowRunView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
