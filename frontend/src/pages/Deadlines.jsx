import { useState, useEffect } from 'react';
import { deadlineAPI } from '../api/services';
import { Plus, X, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Deadlines() {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('upcoming');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title:'', deadline_type:'CIT', due_date:'', description:'', priority:'medium', year_of_assessment: new Date().getFullYear() });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    const params = filter === 'upcoming' ? { upcoming_days: 365, completed: false } : filter === 'completed' ? { completed: true } : {};
    const res = await deadlineAPI.list(params);
    setDeadlines(res.data.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try {
      await deadlineAPI.create({ ...form, year_of_assessment: parseInt(form.year_of_assessment) });
      setShowModal(false); setForm({ title:'', deadline_type:'CIT', due_date:'', description:'', priority:'medium', year_of_assessment: new Date().getFullYear() });
      load();
    } catch(err) { setError(err.response?.data?.error || 'Failed to create deadline'); }
  };

  const handleSeedStandard = async () => {
    const year = new Date().getFullYear();
    await deadlineAPI.seedStandard({ year_of_assessment: year });
    load();
  };

  const handleComplete = async (id) => { await deadlineAPI.complete(id); load(); };

  const dayUntil = d => Math.ceil((new Date(d) - new Date()) / 86400000);
  const PRIORITY_CHIP = { critical:'chip-red', high:'chip-gold', medium:'chip-blue', low:'chip-gray' };
  const TYPE_CHIP = { CIT:'chip-red', CP204:'chip-gold', SST:'chip-blue', WHT:'chip-purple', PCB:'chip-green', 'e-Invoice':'chip-blue' };

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Tax Deadlines</h1><p>Malaysian LHDN statutory filing deadlines</p></div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-outline" onClick={handleSeedStandard}>Seed {new Date().getFullYear()} Deadlines</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14}/> Add Deadline</button>
        </div>
      </div>

      <div className="tabs">
        {[['upcoming','Upcoming'],['all','All'],['completed','Completed']].map(([k,l]) => (
          <button key={k} className={`tab-btn${filter===k?' active':''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Deadline</th><th>Type</th><th>YA</th><th>Due Date</th><th>Days Left</th><th>Priority</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8}><div className="spinner-full"><div className="loading"/></div></td></tr>
              : deadlines.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><h4>No deadlines</h4><p>Add custom or seed standard MY deadlines above.</p></div></td></tr>
              : deadlines.map(d => {
                const days = dayUntil(d.due_date);
                const overdue = days < 0;
                const soon = days >= 0 && days <= 7;
                return (
                  <tr key={d.id} style={{ opacity: d.is_completed ? 0.5 : 1 }}>
                    <td style={{ fontWeight:600 }}>{d.title}</td>
                    <td><span className={`chip ${TYPE_CHIP[d.deadline_type]||'chip-gray'}`}>{d.deadline_type}</span></td>
                    <td className="td-muted">{d.year_of_assessment}</td>
                    <td className="td-muted">{new Date(d.due_date).toLocaleDateString('en-MY')}</td>
                    <td>
                      {d.is_completed ? <span className="text-muted">Done</span>
                      : overdue ? <span style={{ color:'var(--accent-danger)', fontWeight:700 }}>OVERDUE</span>
                      : soon ? <span style={{ color:'var(--accent-warn)', fontWeight:700 }}>{days}d ⚠</span>
                      : <span style={{ color:'var(--accent-2)' }}>{days}d</span>}
                    </td>
                    <td><span className={`chip ${PRIORITY_CHIP[d.priority]||'chip-gray'}`}>{d.priority}</span></td>
                    <td><span className={`chip ${d.is_completed?'chip-green':'chip-gold'}`}>{d.is_completed ? 'Completed' : 'Pending'}</span></td>
                    <td>{!d.is_completed && <button className="btn btn-primary btn-sm" onClick={() => handleComplete(d.id)}><CheckCircle size={12}/> Done</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Deadline</h3><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Title *</label><input className="form-control" required placeholder="CP204 Instalment" value={form.title} onChange={set('title')} /></div>
                  <div className="form-group"><label className="form-label">Type *</label>
                    <select className="form-control" value={form.deadline_type} onChange={set('deadline_type')}>
                      {['CIT','CP204','CP500','SST','WHT','PCB','EIS','EPF','SOCSO','e-Invoice','Audit','AGM','Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Due Date *</label><input className="form-control" type="date" required value={form.due_date} onChange={set('due_date')} /></div>
                  <div className="form-group"><label className="form-label">Year of Assessment</label><input className="form-control" type="number" value={form.year_of_assessment} onChange={set('year_of_assessment')} /></div>
                  <div className="form-group"><label className="form-label">Priority</label>
                    <select className="form-control" value={form.priority} onChange={set('priority')}>
                      {['critical','high','medium','low'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-control" placeholder="Optional notes" value={form.description} onChange={set('description')} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14}/> Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
