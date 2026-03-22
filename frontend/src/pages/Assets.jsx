import { useState, useEffect } from 'react';
import { assetAPI } from '../api/services';
import { Plus, X, Calculator } from 'lucide-react';

const fmt = (n) => `RM ${Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

const CATS = ['plant_machinery','motor_vehicles','office_equipment','furniture','computers','building'];
const CAT_LABELS = { plant_machinery:'Plant & Machinery', motor_vehicles:'Motor Vehicles', office_equipment:'Office Equipment', furniture:'Furniture', computers:'Computers / Software', building:'Industrial Building' };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [caResult, setCaResult] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [caYear, setCaYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const [form, setForm] = useState({ asset_name:'', category:'plant_machinery', acquisition_date:'', cost:'', description:'', useful_life_years:5 });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => { setLoading(true); const res = await assetAPI.list(); setAssets(res.data.data || []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try { await assetAPI.create({ ...form, cost: parseFloat(form.cost), useful_life_years: parseInt(form.useful_life_years) }); setShowModal(false); load(); }
    catch(err) { setError(err.response?.data?.error || 'Failed to add asset'); }
  };

  const calcCA = async (asset) => {
    setSelectedAsset(asset);
    const res = await assetAPI.getCA(asset.id, caYear);
    setCaResult(res.data.data);
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Fixed Assets</h1><p>Capital allowance (Schedule 3, ITA 1967)</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14}/> Add Asset</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Asset Name</th><th>Category</th><th>Acquisition Date</th><th>Cost</th><th>Residual Value</th><th>Status</th><th>CA</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}><div className="spinner-full"><div className="loading"/></div></td></tr>
              : assets.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><h4>No fixed assets yet</h4></div></td></tr>
              : assets.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight:500 }}>{a.asset_name}</td>
                  <td><span className="chip chip-blue">{CAT_LABELS[a.category] || a.category}</span></td>
                  <td className="td-muted">{new Date(a.acquisition_date).toLocaleDateString('en-MY')}</td>
                  <td className="td-mono">{fmt(a.cost)}</td>
                  <td className="td-mono td-muted">{fmt(a.residual_value)}</td>
                  <td><span className={`chip ${a.status==='active'?'chip-green':'chip-gray'}`}>{a.status}</span></td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => calcCA(a)}><Calculator size={12}/> CA</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Fixed Asset</h3><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Asset Name *</label><input className="form-control" required placeholder="Laptop Dell XPS" value={form.asset_name} onChange={set('asset_name')} /></div>
                  <div className="form-group"><label className="form-label">Category *</label>
                    <select className="form-control" value={form.category} onChange={set('category')}>
                      {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Acquisition Date *</label><input className="form-control" type="date" required value={form.acquisition_date} onChange={set('acquisition_date')} /></div>
                  <div className="form-group"><label className="form-label">Cost (RM) *</label><input className="form-control" type="number" required placeholder="50000" value={form.cost} onChange={set('cost')} /></div>
                  <div className="form-group"><label className="form-label">Useful Life (years)</label><input className="form-control" type="number" min="1" value={form.useful_life_years} onChange={set('useful_life_years')} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-control" placeholder="Optional description" value={form.description} onChange={set('description')} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Plus size={14}/> Add Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CA Result Modal */}
      {selectedAsset && caResult && (
        <div className="modal-overlay" onClick={() => { setSelectedAsset(null); setCaResult(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
            <div className="modal-header">
              <h3>Capital Allowance — YA {caResult.year || caYear}</h3>
              <button className="btn-icon" onClick={() => { setSelectedAsset(null); setCaResult(null); }}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom:12, fontWeight:600 }}>{selectedAsset.asset_name}</div>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <input className="form-control" type="number" value={caYear} onChange={e => setCaYear(parseInt(e.target.value))} style={{ width:100 }} />
                <button className="btn btn-primary btn-sm" onClick={() => calcCA(selectedAsset)}>Recalculate</button>
              </div>
              {[
                { label:'Asset Cost', value: fmt(caResult.cost) },
                { label:'Initial Allowance (IA)', value: fmt(caResult.ia), color:'var(--accent-2)' },
                { label:'Annual Allowance (AA)', value: fmt(caResult.aa), color:'var(--accent-2)' },
                { label:'Total CA Claimed', value: fmt(caResult.total_ca), bold:true, color:'var(--accent)' },
                { label:'Residual Expenditure', value: fmt(caResult.residual_expenditure), bold:true },
              ].map(r => (
                <div key={r.label} className="flex-between" style={{ padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{r.label}</span>
                  <span style={{ fontWeight: r.bold?700:400, color: r.color||'var(--text-primary)' }}>{r.value}</span>
                </div>
              ))}
              {caResult.is_year_1 && <div className="alert alert-info mt-4">Year 1: Both Initial Allowance (IA) and Annual Allowance (AA) apply.</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => { setSelectedAsset(null); setCaResult(null); }}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
