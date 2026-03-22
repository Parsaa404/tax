import { useState, useEffect } from 'react';
import { aiAPI } from '../api/services';
import { Sparkles, Tag, TrendingUp, Loader } from 'lucide-react';

export default function AI() {
  const [catForm, setCatForm] = useState({ description:'' });
  const [catResult, setCatResult] = useState(null);
  const [catLoading, setCatLoading] = useState(false);

  const [optForm, setOptForm] = useState({ year_of_assessment: new Date().getFullYear() });
  const [optResult, setOptResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);

  const handleCat = async (e) => {
    e.preventDefault(); setCatLoading(true); setCatResult(null);
    try { const res = await aiAPI.categorize(catForm); setCatResult(res.data.data); }
    catch { setCatResult({ error: true }); }
    finally { setCatLoading(false); }
  };

  const handleOpt = async (e) => {
    e.preventDefault(); setOptLoading(true); setOptResult(null);
    try { const res = await aiAPI.optimize(optForm); setOptResult(res.data.data); }
    catch { setOptResult({ error: true }); }
    finally { setOptLoading(false); }
  };

  const examples = ['Office rent payment', 'Purchase laptop for developer', 'Petrol claim for company car', 'EPF contribution', 'GST refund from LHDN', 'Professional training fee'];

  return (
    <div>
      <div className="page-header">
        <h1>AI Insights</h1>
        <p>Rule-based + AI-powered transaction categorization and tax optimization</p>
      </div>

      <div className="grid-2 mb-6">
        {/* Categorizer */}
        <div className="card">
          <div className="card-header"><h3 style={{ display:'flex',gap:8,alignItems:'center' }}><Tag size={16}/> Transaction Categorizer</h3></div>
          <div className="card-body">
            <form onSubmit={handleCat}>
              <div className="form-group mb-4">
                <label className="form-label">Transaction Description</label>
                <input className="form-control" required placeholder="e.g. Office rent payment for March" value={catForm.description}
                  onChange={e => setCatForm({ description: e.target.value })} />
              </div>
              <div style={{ marginBottom:16 }}>
                <div className="form-label mb-2">Quick examples:</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {examples.map(ex => (
                    <button key={ex} type="button" className="chip chip-gray" style={{ cursor:'pointer', border:'1px solid var(--border)' }}
                      onClick={() => setCatForm({ description: ex })}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={catLoading}>
                {catLoading ? <><div className="loading" style={{ width:14,height:14 }}/> Analyzing…</> : <><Sparkles size={14}/> Categorize</>}
              </button>
            </form>

            {catResult && !catResult.error && (
              <div style={{ marginTop:20, padding:16, background:'var(--bg-elevated)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:12 }}>ANALYSIS RESULT</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'Category', value: catResult.category, chip:'chip-blue' },
                    { label:'Type', value: catResult.transaction_type, chip:'chip-purple' },
                    { label:'Suggested Account', value: catResult.suggested_account, chip:'chip-gray' },
                    { label:'Confidence', value: `${(((catResult.confidence||0.8)*100).toFixed(0))}%`, chip:'chip-green' },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:4 }}>{r.label}</div>
                      <span className={`chip ${r.chip}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12, display:'flex', gap:16, fontSize:'0.8rem' }}>
                  {catResult.is_tax_deductible !== undefined && (
                    <span style={{ color: catResult.is_tax_deductible ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {catResult.is_tax_deductible ? '✓ Tax deductible' : '✕ Not deductible'}
                    </span>
                  )}
                  {catResult.is_aca_eligible && <span style={{ color:'var(--accent-warn)' }}>⚡ ACA eligible (100% Year 1)</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optimizer */}
        <div className="card">
          <div className="card-header"><h3 style={{ display:'flex',gap:8,alignItems:'center' }}><TrendingUp size={16}/> Tax Optimization</h3></div>
          <div className="card-body">
            <form onSubmit={handleOpt}>
              <div className="form-group mb-4">
                <label className="form-label">Year of Assessment</label>
                <select className="form-control" value={optForm.year_of_assessment}
                  onChange={e => setOptForm({ year_of_assessment: parseInt(e.target.value) })}>
                  {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={optLoading}>
                {optLoading ? <><div className="loading" style={{ width:14,height:14 }}/> Generating…</> : <><Sparkles size={14}/> Get Suggestions</>}
              </button>
            </form>

            {optResult && !optResult.error && (
              <div style={{ marginTop:20 }}>
                {(optResult.suggestions || []).map((s, i) => (
                  <div key={i} style={{ padding:'12px 14px', borderRadius:'var(--radius-sm)', background:'var(--bg-elevated)', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <strong style={{ fontSize:'0.87rem' }}>{s.title}</strong>
                      {s.potential_saving && <span className="chip chip-green">Save {s.potential_saving}</span>}
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.6 }}>{s.description}</p>
                    {s.applicable_law && <div style={{ fontSize:'0.72rem', color:'var(--accent-2)', marginTop:6 }}>{s.applicable_law}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="alert alert-info">
        <strong>About AI Insights:</strong> The categorizer uses rule-based pattern matching covering Malaysian tax law (ITA 1967, SST Act 2018, Schedule 3). AI model integration (external LLM) is planned for Phase 7.
      </div>
    </div>
  );
}
