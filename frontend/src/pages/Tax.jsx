import { useState } from 'react';
import { taxAPI } from '../api/services';
import { Calculator, TrendingUp, Percent, Building2, Scale, Globe } from 'lucide-react';

const fmt = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ResultRow({ label, value, bold, highlight }) {
  return (
    <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ color: bold ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, fontSize: '0.87rem', color: highlight || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function Tax() {
  const [tab, setTab] = useState('compute');

  // Full computation form
  const [compForm, setCompForm] = useState({ year_of_assessment: new Date().getFullYear(), gross_revenue: '', total_allowable_expenses: '', total_capital_allowance: '', losses_brought_forward: '0', zakat_paid: '0', cp204_paid: '' });
  const [compResult, setCompResult] = useState(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState('');

  // Quick calculators
  const [cit, setCit] = useState({ chargeableIncome: '', isSME: true, partOfLargeGroup: false, result: null });
  const [sst, setSst] = useState({ amount: '', type: 'service', result: null });
  const [wht, setWht] = useState({ amount: '', paymentType: 'royalty', result: null });
  const [ca,  setCa]  = useState({ cost: '', acquisition_date: '', category: 'plant_machinery', year_of_assessment: new Date().getFullYear(), result: null });
  const [cgt, setCgt] = useState({ consideration_received: '', acquisition_cost: '', is_listed: false, result: null });
  const [gmt, setGmt] = useState({ effective_tax_rate: '', jurisdictional_profit: '', is_mne: false, result: null });

  const setComp = k => e => setCompForm(p => ({ ...p, [k]: e.target.value }));

  const runCompute = async (e) => {
    e.preventDefault(); setCompLoading(true); setCompError('');
    try {
      const res = await taxAPI.compute(Object.fromEntries(
        Object.entries(compForm).map(([k, v]) => [k, isNaN(v) || v === '' ? v : Number(v)])
      ));
      setCompResult(res.data.data);
    } catch (err) { setCompError(err.response?.data?.error || 'Computation failed'); }
    finally { setCompLoading(false); }
  };

  const runCIT = async () => {
    try { const res = await taxAPI.calcCIT({ chargeableIncome: parseFloat(cit.chargeableIncome), isSME: cit.isSME, partOfLargeGroup: cit.partOfLargeGroup }); setCit(p => ({ ...p, result: res.data.data })); } catch(e) { setCit(p => ({ ...p, result: { error: true } })); }
  };
  const runSST = async () => {
    try { const res = await taxAPI.calcSST({ amount: parseFloat(sst.amount), type: sst.type }); setSst(p => ({ ...p, result: res.data.data })); } catch(e) { setSst(p => ({ ...p, result: { error: true } })); }
  };
  const runWHT = async () => {
    try { const res = await taxAPI.calcWHT({ amount: parseFloat(wht.amount), paymentType: wht.paymentType }); setWht(p => ({ ...p, result: res.data.data })); } catch(e) { setWht(p => ({ ...p, result: { error: true } })); }
  };
  const runCA = async () => {
    try { const res = await taxAPI.calcCA({ cost: parseFloat(ca.cost), acquisition_date: ca.acquisition_date, category: ca.category, year_of_assessment: parseInt(ca.year_of_assessment) }); setCa(p => ({ ...p, result: res.data.data })); } catch(e) { setCa(p => ({ ...p, result: { error: true } })); }
  };
  const runCGT = async () => {
    try { const res = await taxAPI.calcCGT({ consideration_received: parseFloat(cgt.consideration_received), acquisition_cost: parseFloat(cgt.acquisition_cost), is_listed: cgt.is_listed }); setCgt(p => ({ ...p, result: res.data.data })); } catch(e) { setCgt(p => ({ ...p, result: { error: true, message: 'Calculation failed' } })); }
  };
  const runGMT = async () => {
    try { const res = await taxAPI.calcGMT({ effective_tax_rate: parseFloat(gmt.effective_tax_rate) / 100, jurisdictional_profit: parseFloat(gmt.jurisdictional_profit || 0), is_mne: gmt.is_mne }); setGmt(p => ({ ...p, result: res.data.data })); } catch(e) { setGmt(p => ({ ...p, result: { error: true } })); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tax Engine</h1>
        <p>Malaysian tax computation — CIT, SST, WHT, Capital Allowance</p>
      </div>

      <div className="tabs">
        {['compute', 'cit', 'sst', 'wht', 'ca', 'cgt', 'gmt'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {{ compute: '📋 Full Computation', cit: '🏢 CIT', sst: '🛒 SST', wht: '💸 WHT', ca: '🏭 Capital Allowance', cgt: '📈 CGT', gmt: '🌍 GMT' }[t]}
          </button>
        ))}
      </div>

      {/* ── Full Tax Computation ── */}
      {tab === 'compute' && (
        <div className="grid-65-35">
          <div className="card">
            <div className="card-header"><h3>Annual Tax Computation</h3></div>
            <div className="card-body">
              {compError && <div className="alert alert-error mb-4">{compError}</div>}
              <form onSubmit={runCompute}>
                <div className="form-grid mb-4">
                  <div className="form-group"><label className="form-label">Year of Assessment</label>
                    <input className="form-control" type="number" required value={compForm.year_of_assessment} onChange={setComp('year_of_assessment')} /></div>
                  <div className="form-group"><label className="form-label">Gross Revenue (RM)</label>
                    <input className="form-control" type="number" required placeholder="2000000" value={compForm.gross_revenue} onChange={setComp('gross_revenue')} /></div>
                  <div className="form-group"><label className="form-label">Total Allowable Expenses (RM)</label>
                    <input className="form-control" type="number" required placeholder="1400000" value={compForm.total_allowable_expenses} onChange={setComp('total_allowable_expenses')} /></div>
                  <div className="form-group"><label className="form-label">Capital Allowance (RM)</label>
                    <input className="form-control" type="number" placeholder="100000" value={compForm.total_capital_allowance} onChange={setComp('total_capital_allowance')} /></div>
                  <div className="form-group"><label className="form-label">Losses B/F (RM)</label>
                    <input className="form-control" type="number" placeholder="0" value={compForm.losses_brought_forward} onChange={setComp('losses_brought_forward')} /></div>
                  <div className="form-group"><label className="form-label">Zakat Paid (RM)</label>
                    <input className="form-control" type="number" placeholder="0" value={compForm.zakat_paid} onChange={setComp('zakat_paid')} /></div>
                  <div className="form-group"><label className="form-label">CP204 Instalments Paid (RM)</label>
                    <input className="form-control" type="number" placeholder="50000" value={compForm.cp204_paid} onChange={setComp('cp204_paid')} /></div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={compLoading}>
                  {compLoading ? <><div className="loading" style={{width:14,height:14}} /> Computing…</> : <><Calculator size={14}/> Compute Tax</>}
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Computation Result</h3>
              {compResult && <span className="chip chip-green">YA {compResult.year_of_assessment}</span>}
            </div>
            <div className="card-body">
              {!compResult ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <Calculator size={40} />
                  <h4>Fill in the form</h4>
                  <p>Results will appear here</p>
                </div>
              ) : (
                <>
                  <ResultRow label="Gross Revenue" value={fmt(compResult.gross_revenue)} />
                  <ResultRow label="Less: Allowable Expenses" value={`(${fmt(compResult.total_allowable_expenses)})`} highlight="var(--accent-danger)" />
                  <ResultRow label="Less: Capital Allowance"  value={`(${fmt(compResult.total_capital_allowance)})`} highlight="var(--accent-danger)" />
                  <ResultRow label="Less: Losses B/F" value={`(${fmt(compResult.losses_brought_forward)})`} highlight="var(--accent-danger)" />
                  <ResultRow label="Chargeable Income" value={fmt(compResult.chargeable_income)} bold highlight="var(--accent-2)" />
                  <ResultRow label="Tax Rate" value={compResult.is_sme ? 'SME (15%/17%/24%)' : 'Standard 24%'} />
                  <ResultRow label="Tax Before Rebates" value={fmt(compResult.tax_before_rebates)} bold />
                  <ResultRow label="Less: Zakat" value={`(${fmt(compResult.zakat_paid)})`} />
                  <ResultRow label="Less: CP204 Paid"  value={`(${fmt(compResult.cp204_paid)})`} />
                  <ResultRow label="Balance Tax Payable" value={fmt(compResult.balance_tax_payable)} bold highlight={parseFloat(compResult.balance_tax_payable) > 0 ? 'var(--accent-danger)' : 'var(--accent)'} />
                  <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Effective Rate</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {(parseFloat(compResult.effective_rate || 0) * 100).toFixed(2)}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CIT Calculator ── */}
      {tab === 'cit' && (
        <div className="grid-2">
          <div className="card"><div className="card-header"><h3>CIT Calculator</h3><span className="chip chip-gold">ITA 1967</span></div>
            <div className="card-body">
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>SME Tiered Rates (Paid-up ≤ RM2.5M):</strong><br/>
                First RM150,000 → <strong style={{ color: 'var(--accent)' }}>15%</strong>&nbsp;&nbsp;
                Next RM450,000 → <strong style={{ color: 'var(--accent-warn)' }}>17%</strong>&nbsp;&nbsp;
                Remainder → <strong style={{ color: 'var(--accent-danger)' }}>24%</strong>
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Chargeable Income (RM)</label>
                <input className="form-control" type="number" placeholder="500000" value={cit.chargeableIncome} onChange={e => setCit(p => ({ ...p, chargeableIncome: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={cit.isSME} onChange={e => setCit(p => ({ ...p, isSME: e.target.checked }))} />
                  SME (Paid-up ≤ RM2.5M)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={cit.partOfLargeGroup} onChange={e => setCit(p => ({ ...p, partOfLargeGroup: e.target.checked }))} />
                  Part of large group
                </label>
              </div>
              <button className="btn btn-primary" onClick={runCIT}><Calculator size={14} /> Calculate</button>
              {cit.result && (
                <div style={{ marginTop: 20 }}>
                  <ResultRow label="First RM150k (15%)" value={fmt(cit.result.tax_on_first_band)} />
                  <ResultRow label="Next RM450k (17%)" value={fmt(cit.result.tax_on_second_band)} />
                  <ResultRow label="Remainder (24%)" value={fmt(cit.result.tax_on_remainder)} />
                  <ResultRow label="Total Tax" value={fmt(cit.result.total_tax)} bold highlight="var(--accent-danger)" />
                  <ResultRow label="Effective Rate" value={`${(parseFloat(cit.result.effective_rate || 0) * 100).toFixed(2)}%`} bold highlight="var(--accent-warn)" />
                </div>
              )}
            </div>
          </div>
          <div className="card"><div className="card-header"><h3>Tax Bands Breakdown</h3></div>
            <div className="card-body">
              {['15% on first RM150,000', '17% on next RM450,000', '24% on remainder'].map((band, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{['Band 1','Band 2','Band 3'][i]}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{band}</div>
                  </div>
                  <span className={`chip ${['chip-green','chip-gold','chip-red'][i]}`}>{['15%','17%','24%'][i]}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--accent-warn)' }}>Note:</strong> SME tiered rates apply only if paid-up capital ≤ RM2.5M and not part of a large group (Section 2,  ITA 1967).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SST Calculator ── */}
      {tab === 'sst' && (
        <div className="grid-2">
          <div className="card"><div className="card-header"><h3>SST Calculator</h3><span className="chip chip-blue">SST Act 2018</span></div>
            <div className="card-body">
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>SST Registration Threshold:</strong> RM 500,000 annual taxable turnover<br/>
                <strong style={{ color: 'var(--text-primary)' }}>e-Invoice (MyInvois):</strong> Mandatory for ALL B2B, B2C, B2G transactions from 2026
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Amount (RM)</label>
                <input className="form-control" type="number" placeholder="10000" value={sst.amount} onChange={e => setSst(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Tax Type</label>
                <select className="form-control" value={sst.type} onChange={e => setSst(p => ({ ...p, type: e.target.value }))}>
                  <option value="service">Service Tax — Standard (8%)</option>
                  <option value="service_fb">Service Tax — F&amp;B / Telecom (6%)</option>
                  <option value="sales_standard">Sales Tax Standard (10%)</option>
                  <option value="sales_reduced">Sales Tax Reduced (5%)</option>
                  <option value="zero">Zero-rated (0%)</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={runSST}><Calculator size={14} /> Calculate</button>
              {sst.result && (
                <div style={{ marginTop: 20 }}>
                  <ResultRow label="Taxable Amount" value={fmt(sst.result.taxable_amount)} />
                  <ResultRow label="SST Rate" value={`${(parseFloat(sst.result.rate || 0) * 100).toFixed(0)}%`} />
                  <ResultRow label="Tax Amount" value={fmt(sst.result.tax_amount)} bold highlight="var(--accent-warn)" />
                  <ResultRow label="Total Payable" value={fmt(sst.result.total)} bold highlight="var(--accent)" />
                </div>
              )}
            </div>
          </div>
          <div className="card"><div className="card-header"><h3>SST Rate Table (2026)</h3></div>
            <div className="card-body">
              {[{ name:'Service Tax (Standard)', rate:'8%', desc:'Professional services, IT, hotel, consultancy, parking', chip:'chip-red' },
                { name:'Service Tax (F&B & Telecom)', rate:'6%', desc:'Food & beverage outlets, telecommunications (unchanged)', chip:'chip-gold' },
                { name:'Sales Tax (Standard)', rate:'10%', desc:'Manufactured/imported goods — electronics, furniture, cosmetics', chip:'chip-gold' },
                { name:'Sales Tax (Reduced)', rate:'5%', desc:'Food preparations, certain construction materials', chip:'chip-blue' },
                { name:'Zero-rated', rate:'0%', desc:'Exports, basic food, agriculture inputs', chip:'chip-green' },
              ].map(r => (
                <div key={r.name} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex-between mb-2"><span style={{ fontWeight: 600 }}>{r.name}</span><span className={`chip ${r.chip}`}>{r.rate}</span></div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.desc}</p>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ⚠️ <strong>e-Invoice Mandatory (2026):</strong> All B2B, B2C, B2G transactions must use LHDN MyInvois. Traditional invoices are no longer accepted for tax deduction claims.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WHT Calculator ── */}
      {tab === 'wht' && (
        <div className="grid-2">
          <div className="card"><div className="card-header"><h3>Withholding Tax</h3><span className="chip chip-purple">Section 107A-109</span></div>
            <div className="card-body">
              <div className="form-group mb-4">
                <label className="form-label">Payment Amount (RM)</label>
                <input className="form-control" type="number" placeholder="50000" value={wht.amount} onChange={e => setWht(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Payment Type</label>
                <select className="form-control" value={wht.paymentType} onChange={e => setWht(p => ({ ...p, paymentType: e.target.value }))}>
                  <option value="royalty">Royalties (10%)</option>
                  <option value="interest">Interest (15%)</option>
                  <option value="technical_fees">Technical Service Fees (10%)</option>
                  <option value="contract_payments">Contract Payments (10%/3%)</option>
                  <option value="dividends">Dividends (0% — Single-tier)</option>
                  <option value="rental">Rental of Movable Property (10%)</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={runWHT}><Calculator size={14} /> Calculate</button>
              {wht.result && (
                <div style={{ marginTop: 20 }}>
                  <ResultRow label="Gross Payment" value={fmt(wht.result.gross_amount)} />
                  <ResultRow label="WHT Rate" value={`${(parseFloat(wht.result.rate || 0) * 100).toFixed(0)}%`} />
                  <ResultRow label="Tax Withheld" value={fmt(wht.result.tax_amount)} bold highlight="var(--accent-danger)" />
                  <ResultRow label="Net Payment to Recipient" value={fmt(wht.result.net_payment)} bold highlight="var(--accent)" />
                </div>
              )}
            </div>
          </div>
          <div className="card"><div className="card-header"><h3>WHT Rate Reference</h3></div>
            <div className="card-body">
              {[{ type:'Royalties', rate:'10%' },{ type:'Interest', rate:'15%' },{ type:'Technical Fees', rate:'10%' },
                { type:'Contract (Company)', rate:'10%' },{ type:'Contract (Individual)', rate:'3%' },
                { type:'Dividends', rate:'0%' },{ type:'Rental (Movable)', rate:'10%' },
              ].map(r => (
                <div key={r.type} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{r.type}</span>
                  <span className={`chip ${r.rate === '0%' ? 'chip-green' : 'chip-gold'}`}>{r.rate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Capital Allowance ── */}
      {tab === 'ca' && (
        <div className="grid-2">
          <div className="card"><div className="card-header"><h3>Capital Allowance</h3><span className="chip chip-blue">Schedule 3</span></div>
            <div className="card-body">
              <div className="form-grid mb-4">
                <div className="form-group"><label className="form-label">Asset Cost (RM)</label>
                  <input className="form-control" type="number" placeholder="100000" value={ca.cost} onChange={e => setCa(p => ({ ...p, cost: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Acquisition Date</label>
                  <input className="form-control" type="date" value={ca.acquisition_date} onChange={e => setCa(p => ({ ...p, acquisition_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Asset Category</label>
                  <select className="form-control" value={ca.category} onChange={e => setCa(p => ({ ...p, category: e.target.value }))}>
                    <option value="plant_machinery">Plant & Machinery (IA20%+AA20%)</option>
                    <option value="motor_vehicles">Motor Vehicles (IA20%+AA20%)</option>
                    <option value="office_equipment">Office Equipment (IA20%+AA20%)</option>
                    <option value="furniture">Furniture & Fixtures (IA20%+AA10%)</option>
                    <option value="computers">Computers & Software (ACA 100%)</option>
                    <option value="building">Industrial Building (IA10%+AA3%)</option>
                  </select></div>
                <div className="form-group"><label className="form-label">Year of Assessment</label>
                  <input className="form-control" type="number" value={ca.year_of_assessment} onChange={e => setCa(p => ({ ...p, year_of_assessment: e.target.value }))} /></div>
              </div>
              <button className="btn btn-primary" onClick={runCA}><Calculator size={14} /> Calculate CA</button>
              {ca.result && (
                <div style={{ marginTop: 20 }}>
                  <ResultRow label="Asset Cost" value={fmt(ca.result.cost)} />
                  <ResultRow label="Initial Allowance (IA)" value={fmt(ca.result.ia)} highlight="var(--accent-2)" />
                  <ResultRow label="Annual Allowance (AA)" value={fmt(ca.result.aa)} highlight="var(--accent-2)" />
                  <ResultRow label="Total CA Claimed" value={fmt(ca.result.total_ca)} bold highlight="var(--accent)" />
                  <ResultRow label="Residual Expenditure" value={fmt(ca.result.residual_expenditure)} bold />
                </div>
              )}
            </div>
          </div>
          <div className="card"><div className="card-header"><h3>CA Rate Table</h3></div>
            <div className="card-body">
              {[
                { cat:'Plant & Machinery', ia:'20%', aa:'20%', note:'' },
                { cat:'Motor Vehicles', ia:'20%', aa:'20%', note:'' },
                { cat:'Office Equipment', ia:'20%', aa:'20%', note:'' },
                { cat:'Furniture & Fixtures', ia:'20%', aa:'10%', note:'' },
                { cat:'Computers & Software', ia:'—', aa:'100%', note:'ACA (write-off in Yr 1)' },
                { cat:'Industrial Building', ia:'10%', aa:'3%', note:'' },
              ].map(r => (
                <div key={r.cat} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.cat}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="chip chip-blue">IA {r.ia}</span>
                      <span className="chip chip-green">AA {r.aa}</span>
                    </div>
                  </div>
                  {r.note && <p style={{ fontSize: '0.72rem', color: 'var(--accent-warn)', marginTop: 4 }}>{r.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CGT Calculator ── */}
      {tab === 'cgt' && (
        <div className="grid-2">
          <div className="card"><div className="card-header"><h3>Capital Gains Tax</h3><span className="chip chip-red">CGTA 2023 · In Force 2026</span></div>
            <div className="card-body">
              <div style={{ marginBottom:16, padding:14, background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--text-primary)' }}>Scope:</strong> 10% on net gains from disposal of <strong>unlisted shares</strong> in Malaysian companies.<br/>
                <strong style={{ color:'var(--accent)' }}>Exempt:</strong> Listed shares on Bursa Malaysia. Gains from real property → RPGT applies instead.
              </div>
              <div className="form-grid mb-4">
                <div className="form-group"><label className="form-label">Sale Proceeds (RM)</label>
                  <input className="form-control" type="number" placeholder="500000" value={cgt.consideration_received} onChange={e => setCgt(p => ({ ...p, consideration_received: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Acquisition Cost (RM)</label>
                  <input className="form-control" type="number" placeholder="200000" value={cgt.acquisition_cost} onChange={e => setCgt(p => ({ ...p, acquisition_cost: e.target.value }))} /></div>
              </div>
              <label style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer', fontSize:'0.85rem', marginBottom:16 }}>
                <input type="checkbox" checked={cgt.is_listed} onChange={e => setCgt(p => ({ ...p, is_listed: e.target.checked }))} />
                Shares are listed on Bursa Malaysia (CGT-exempt)
              </label>
              <button className="btn btn-primary" onClick={runCGT}><Calculator size={14}/> Calculate CGT</button>
              {cgt.result && !cgt.result.error && (
                <div style={{ marginTop:20 }}>
                  {cgt.result.listed ? (
                    <div className="alert alert-success mt-4">✅ Listed shares are CGT-exempt. No tax payable.</div>
                  ) : (
                    <>
                      <ResultRow label="Sale Proceeds" value={fmt(cgt.result.consideration_received)} />
                      <ResultRow label="Acquisition Cost" value={`(${fmt(cgt.result.acquisition_cost)})`} highlight="var(--accent-danger)" />
                      <ResultRow label="Net Gain" value={fmt(cgt.result.gross_gain)} bold highlight="var(--accent-2)" />
                      <ResultRow label="CGT Rate" value="10%" />
                      <ResultRow label="CGT Payable" value={fmt(cgt.result.cgt_payable)} bold highlight="var(--accent-danger)" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="card"><div className="card-header"><h3>CGT Reference (2026)</h3></div>
            <div className="card-body">
              {[{ cat:'Unlisted Malaysian Shares', rate:'10%', chip:'chip-red', desc:'Net gain on disposal. Effective 1 March 2024 (CGTA 2023).' },
                { cat:'Bursa Listed Shares', rate:'Exempt', chip:'chip-green', desc:'Shares listed on Bursa Malaysia are exempted from CGT.' },
                { cat:'Foreign Unlisted Shares', rate:'10%', chip:'chip-red', desc:'Gains from unlisted foreign company shares — check DTA treaty.' },
                { cat:'Real Property / REIT', rate:'RPGT', chip:'chip-gold', desc:'Subject to RPGT regime (separate from CGT).' },
              ].map(r => (
                <div key={r.cat} style={{ padding:'10px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <div className="flex-between mb-2"><span style={{ fontWeight:600, fontSize:'0.87rem' }}>{r.cat}</span><span className={`chip ${r.chip}`}>{r.rate}</span></div>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{r.desc}</p>
                </div>
              ))}
              <div style={{ marginTop:14, padding:12, background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', fontSize:'0.78rem', color:'var(--text-muted)', lineHeight:1.7 }}>
                <strong style={{ color:'var(--accent-warn)' }}>Filing:</strong> CGT is self-assessed. Pay within 60 days of disposal via e-Filing at MyTax portal.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GMT Calculator ── */}
      {tab === 'gmt' && (
        <div className="grid-2">
          <div className="card"><div className="card-header"><h3>Global Minimum Tax (GMT)</h3><span className="chip chip-purple">Pillar Two · QDMTT</span></div>
            <div className="card-body">
              <div style={{ marginBottom:16, padding:14, background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--accent-warn)' }}>⚠ SMEs are NOT affected.</strong> GMT applies only to MNE groups with global consolidated revenue ≥ EUR 750 million. Malaysia collects top-up tax via QDMTT.
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Current Effective Tax Rate (%)</label>
                <input className="form-control" type="number" step="0.1" placeholder="9.5" value={gmt.effective_tax_rate} onChange={e => setGmt(p => ({ ...p, effective_tax_rate: e.target.value }))} />
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>ETR = Taxes Paid ÷ Accounting Profit × 100</div>
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Malaysian Jurisdictional Profit (RM)</label>
                <input className="form-control" type="number" placeholder="5000000" value={gmt.jurisdictional_profit} onChange={e => setGmt(p => ({ ...p, jurisdictional_profit: e.target.value }))} />
              </div>
              <label style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer', fontSize:'0.85rem', marginBottom:16 }}>
                <input type="checkbox" checked={gmt.is_mne} onChange={e => setGmt(p => ({ ...p, is_mne: e.target.checked }))} />
                This is an MNE group (global revenue ≥ EUR 750M)
              </label>
              <button className="btn btn-primary" onClick={runGMT}><Calculator size={14}/> Assess GMT</button>
              {gmt.result && (
                <div style={{ marginTop:20 }}>
                  {!gmt.result.applicable || gmt.result.top_up_tax === 0 ? (
                    <div className="alert alert-success mt-4">✅ {gmt.result.note}</div>
                  ) : (
                    <>
                      <ResultRow label="Current ETR" value={`${(gmt.result.current_etr * 100).toFixed(2)}%`} highlight="var(--accent-danger)" />
                      <ResultRow label="Minimum ETR" value={`${(gmt.result.minimum_rate * 100).toFixed(0)}%`} />
                      <ResultRow label="Top-up Rate" value={`${(gmt.result.top_up_rate * 100).toFixed(2)}%`} bold highlight="var(--accent-warn)" />
                      <ResultRow label="QDMTT Top-up Tax" value={fmt(gmt.result.top_up_tax)} bold highlight="var(--accent-danger)" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="card"><div className="card-header"><h3>GMT / Pillar Two Reference</h3></div>
            <div className="card-body">
              {[{ label:'Minimum Rate', value:'15%', color:'chip-red' },
                { label:'Revenue Threshold', value:'EUR 750M', color:'chip-purple' },
                { label:'Malaysia Mechanism', value:'QDMTT', color:'chip-blue' },
                { label:'SME Impact', value:'None', color:'chip-green' },
                { label:'Legal Basis', value:'Finance Act 2023', color:'chip-gray' },
              ].map(r => (
                <div key={r.label} className="flex-between" style={{ padding:'10px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize:'0.85rem' }}>{r.label}</span><span className={`chip ${r.color}`}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop:14, fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.8 }}>
                <div style={{ marginBottom:6 }}><strong style={{ color:'var(--text-primary)' }}>QDMTT</strong> = Qualified Domestic Minimum Top-up Tax. Malaysia collects the top-up locally before another jurisdiction can.</div>
                <div><strong style={{ color:'var(--text-primary)' }}>GloBE Rules</strong> (Global Anti-Base Erosion) form the technical foundation, adopted by Malaysia via Finance Act 2023.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
