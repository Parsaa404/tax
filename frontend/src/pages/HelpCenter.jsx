import { useState } from 'react';
import { BookOpen, Calculator, Users, FileText, ShoppingBag, Package, BarChart3, Sparkles, Calendar, DollarSign, AlertTriangle, ChevronRight, X } from 'lucide-react';

const SECTIONS = [
  {
    id: 'overview',
    icon: BookOpen,
    title: 'System Overview',
    color: 'blue',
    content: [
      { q: 'What is MYTax?', a: 'MYTax is a fully integrated Malaysian tax and accounting platform built around the self-assessment system (SAS) used by LHDN. It covers double-entry bookkeeping, CIT computation, payroll (EPF/SOCSO/EIS/PCB), SST, e-invoicing via MyInvois, and all common Malaysian tax filings.' },
      { q: 'Is MYTax based on 2026 laws?', a: 'Yes. All calculations are updated for YA 2026, including: SME gross income threshold (RM50M), Capital Gains Tax (CGTA 2023), Global Minimum Tax (GMT Pillar Two, Finance Act 2023), SST 8%/6% dual rate, and mandatory e-Invoice (MyInvois, no transition period).' },
      { q: 'What is the territorial tax system?', a: 'Malaysia taxes income on a territorial basis: income accrued in or derived from Malaysia is taxable. Foreign-sourced income (FSI) is only taxable upon remittance into Malaysia. This applies to resident companies.' },
    ]
  },
  {
    id: 'cit',
    icon: Calculator,
    title: 'Corporate Income Tax (CIT)',
    color: 'gold',
    content: [
      { q: 'What are the CIT rates for 2026?', a: 'SME companies (paid-up capital ≤ RM2.5M AND gross income ≤ RM50M):\n• First RM150,000: 15%\n• RM150,001 – RM600,000: 17%\n• Above RM600,000: 24%\n\nNon-SME / large companies: flat 24% on all chargeable income.' },
      { q: 'What qualifies as an SME?', a: 'Both conditions must be met:\n① Paid-up ordinary share capital ≤ RM2.5 million\n② Gross income ≤ RM50 million (new 2026 condition)\nAND the company must NOT be part of a large group that controls another company with paid-up capital > RM2.5M.' },
      { q: 'How is chargeable income computed?', a: 'Gross Revenue\n− Allowable Business Expenses (s.33, ITA 1967)\n= Adjusted Income\n− Capital Allowance (Schedule 3)\n= Statutory Income\n− Losses Brought Forward\n= Chargeable Income\n→ Apply CIT rate bands.' },
      { q: 'What is CP204?', a: 'CP204 is the estimated tax form. Every company must submit it 30 days before the start of each new financial year, estimating the tax for that year. The estimated amount is paid in 12 equal monthly instalments, due by the 10th of each month.' },
      { q: 'What is Form C?', a: 'Form C is the annual corporate tax return. It must be filed within 7 months of the financial year end. If actual tax exceeds the CP204 estimate, the balance must be paid. If overpaid, a refund can be claimed.' },
      { q: 'Can Zakat offset tax?', a: 'Yes. For Muslim-owned companies, Zakat payments reduce the final tax liability up to a maximum of 10% of the tax payable (Section 132B, ITA 1967). This is applied after all deductions but before CP204 credit.' },
    ]
  },
  {
    id: 'sst',
    icon: ShoppingBag,
    title: 'SST & e-Invoice',
    color: 'red',
    content: [
      { q: 'Who must register for SST?', a: 'Any business with annual taxable turnover ≥ RM500,000 must register with RMCD (Royal Malaysian Customs Department) for SST. Registration applies separately to Sales Tax and Service Tax.' },
      { q: 'What are the Service Tax rates in 2026?', a: 'Service Tax has two rates:\n• 8% — Standard rate for: professional services, IT services, hotels, accountancy, management, consultancy, employment agencies, parking.\n• 6% — Reduced rate for: Food & beverage outlets and telecommunications (rate unchanged).' },
      { q: 'What are the Sales Tax rates?', a: '• 10% — Standard rate for manufactured goods and imports (e.g. electronics, furniture, cosmetics, building materials not listed below).\n• 5% — Reduced rate for certain food preparations and specific construction materials.\n• 0% — Zero-rated for exports, basic foodstuffs, agriculture inputs.' },
      { q: 'Is e-Invoice mandatory in 2026?', a: 'YES — 100% mandatory. The transition period ended July 2025. From 2026, ALL transactions (B2B, B2C, B2G) must be submitted to and validated by LHDN\'s MyInvois platform in real-time. Traditional paper invoices cannot be used for tax deduction claims.' },
      { q: 'How does e-Invoice work in MYTax?', a: 'When you create an invoice and mark it as "Sent", you can click "Submit e-Invoice" to push it to LHDN MyInvois. The system will receive a UUID and validation status. Only MyInvois-validated invoices are legally recognised for SST credit claims.' },
    ]
  },
  {
    id: 'cgt',
    icon: DollarSign,
    title: 'Capital Gains Tax (CGT)',
    color: 'red',
    content: [
      { q: 'What is CGT in Malaysia?', a: 'Malaysia introduced Capital Gains Tax (CGT) via the Capital Gains Tax Act 2023 (CGTA 2023), effective 1 March 2024. By 2026, it is fully operational for all qualifying disposals.' },
      { q: 'What is subject to CGT?', a: 'CGT at 10% applies on net gains from the disposal of:\n• Unlisted shares in Malaysian incorporated companies\n• Unlisted shares in foreign companies\n\nNote: Gains from listed shares on Bursa Malaysia are CGT-EXEMPT.' },
      { q: 'What is exempt from CGT?', a: '• Shares listed on Bursa Malaysia\n• Gains from real property (use RPGT instead)\n• Government securities\n• Unit trusts\n• Venture capital investments (subject to conditions)' },
      { q: 'How is CGT calculated?', a: 'CGT = (Sale Proceeds − Acquisition Cost) × 10%\n\nAlso deductible from the gain:\n• Incidental costs of acquisition (stamp duty, legal fees)\n• Costs of disposal (agent fees, legal fees)' },
      { q: 'When must CGT be paid?', a: 'CGT is self-assessed. The taxable gain must be reported and tax paid within 60 days of the disposal date via e-Filing on the MyTax portal (LHDN). Use form CKHT 2A (for companies).' },
    ]
  },
  {
    id: 'gmt',
    icon: AlertTriangle,
    title: 'Global Minimum Tax (GMT)',
    color: 'purple',
    content: [
      { q: 'What is GMT and who does it affect?', a: 'GMT (Global Minimum Tax), also known as Pillar Two or GloBE Rules, ensures multinational enterprise (MNE) groups with global consolidated revenue ≥ EUR 750 million pay at least 15% effective tax rate in every jurisdiction they operate in.\n\n⚠️ SMEs and local companies are NOT affected.' },
      { q: 'How does Malaysia implement GMT?', a: 'Malaysia adopted the QDMTT (Qualified Domestic Minimum Top-up Tax) mechanism via the Finance Act 2023. If an MNE\'s effective tax rate (ETR) in Malaysia falls below 15%, Malaysia collects the difference (top-up tax) before any other country can.' },
      { q: 'What is ETR and how is it calculated?', a: 'ETR = (Adjusted Covered Taxes) ÷ (GloBE Income or Loss)\n\nSimplified: ETR ≈ Tax Paid ÷ Accounting Profit × 100%\n\nIf ETR < 15%, the top-up = (15% − ETR) × Jurisdictional Profit.' },
      { q: 'My company is an SME. Do I need to worry about GMT?', a: 'No. GMT only applies to specific MNE groups with global revenue above EUR 750 million (approximately RM3.6 billion). Standard Malaysian SMEs and even mid-sized companies are entirely exempt.' },
    ]
  },
  {
    id: 'payroll',
    icon: Users,
    title: 'Payroll (EPF, SOCSO, EIS, PCB)',
    color: 'green',
    content: [
      { q: 'What statutory deductions does MYTax compute?', a: 'MYTax automatically calculates all mandatory Malaysian payroll deductions:\n• EPF (KWSP) — Employee 11%, Employer 13% / 12%\n• SOCSO (PERKESO) — Employee 0.5%, Employer 1.75% (on first RM4,000)\n• EIS (SIP) — Employee 0.2%, Employer 0.2% (on first RM4,000, max age 57)\n• PCB — Monthly Tax Deduction (based on income brackets, status, reliefs)\n• Zakat — For Muslim employees (optional)' },
      { q: 'What are the EPF rates?', a: 'Employee rates:\n• Age < 60: 11%\n• Age ≥ 60: 5.5%\n\nEmployer rates (since 1 January 2024):\n• Salary ≤ RM5,000: 13%\n• Salary > RM5,000: 12%\n• Employee age ≥ 60: 4%' },
      { q: 'How does PCB (monthly tax deduction) work?', a: 'PCB is monthly withholding of individual income tax. MYTax uses the official income tax brackets (YA 2026), personal relief (RM9,000), spouse relief (RM4,000), and child relief (RM2,000 per child) to estimate the annual tax and divide by 12.' },
      { q: 'What is the payroll workflow?', a: '① Add employees with IC, DOB, salary, EPF no., spouse/child status.\n② Click "Run Payroll" → select year and month.\n③ System calculates EPF, SOCSO, EIS, PCB, Zakat for all employees.\n④ Review the payroll run detail (gross, deductions, net).\n⑤ Click "Approve" to finalise. Approved runs post journal entries automatically.' },
    ]
  },
  {
    id: 'accounting',
    icon: BookOpen,
    title: 'Double-Entry Bookkeeping',
    color: 'blue',
    content: [
      { q: 'What accounting standard does MYTax use?', a: 'MYTax uses the double-entry bookkeeping system aligned with MFRS (Malaysian Financial Reporting Standards). Every transaction debits one or more accounts and credits one or more accounts, with total debits always equalling total credits.' },
      { q: 'What accounts are pre-seeded?', a: 'On registration, MYTax seeds a complete Chart of Accounts covering: Assets (Cash, Receivables, Fixed Assets, Prepayments), Liabilities (Payables, Loans, Tax Payable), Equity (Share Capital, Retained Earnings), Revenue, COGS, and Expenses.' },
      { q: 'Why is depreciation NOT a tax deduction?', a: 'Under ITA 1967, accounting depreciation is not an allowable deduction. Instead, companies claim Capital Allowance (Schedule 3), which follows LHDN\'s prescribed IA + AA rates. MYTax\'s Tax Engine handles both independently.' },
      { q: 'Can I void a transaction?', a: 'Yes. Posted transactions can be voided (but never deleted), preserving the full audit trail as required by the Companies Act 2016 and LHDN record-keeping requirements. Voiding reverses the journal entries.' },
    ]
  },
  {
    id: 'ca',
    icon: Package,
    title: 'Capital Allowance',
    color: 'blue',
    content: [
      { q: 'What is Capital Allowance (CA)?', a: 'Capital Allowance replaces accounting depreciation as a tax deduction. Governed by Schedule 3 of ITA 1967, it allows businesses to deduct the cost of qualifying fixed assets from their chargeable income over time.' },
      { q: 'What are the CA rates?', a: 'Asset type / IA / AA:\n• Plant & Machinery: 20% / 20%\n• Motor Vehicles: 20% / 20%\n• Office Equipment: 20% / 20%\n• Furniture & Fixtures: 20% / 10%\n• Computers & Software: —% / 100% (ACA — full write-off Year 1)\n• Industrial Buildings: 10% / 3%\n\nIA (Initial Allowance) applies only in Year 1. AA (Annual Allowance) applies every year.' },
      { q: 'What is Accelerated Capital Allowance (ACA)?', a: 'For computers, servers, and software (and certain other qualifying assets), companies can claim 100% of the cost in Year 1 under ACA, instead of spreading it over multiple years. This is a major incentive for technology investment.' },
    ]
  },
  {
    id: 'wht',
    icon: DollarSign,
    title: 'Withholding Tax (WHT)',
    color: 'purple',
    content: [
      { q: 'What is Withholding Tax?', a: 'WHT is a deduction made by a Malaysian company when paying a non-resident (foreign) entity. The payer must withhold an amount and remit it directly to LHDN within 1 month of paying.' },
      { q: 'What are the WHT rates?', a: '• Royalties & licenses: 10%\n• Technical/management service fees: 10%\n• Interest payments: 15%\n• Contract payments (company): 10%\n• Contract payments (individual): 3%\n• Dividends: 0% (single-tier system)\n• Rental of movable property: 10%' },
      { q: 'Are there tax treaty exemptions?', a: 'Yes. Malaysia has Double Tax Agreements (DTAs) with 70+ countries. WHT rates may be reduced or eliminated under these treaties. Always check the relevant DTA before applying standard rates.' },
    ]
  },
  {
    id: 'incentives',
    icon: Sparkles,
    title: 'Tax Incentives',
    color: 'gold',
    content: [
      { q: 'What is Pioneer Status?', a: 'Pioneer Status grants 70%–100% income tax exemption for 5–10 years for companies in promoted industries (high-tech, advanced manufacturing, biotech, strategic services). Applied for via MIDA. The tax-exempt income is credited to a "Pioneer Account".' },
      { q: 'What other incentives are available?', a: 'Common incentives include:\n• Investment Tax Allowance (ITA) — 60%–100% of qualifying capital expenditure as deduction\n• Reinvestment Allowance (RA) — 60% of QCE for expansions\n• Research & Development — 100%–200% deduction on qualifying R&D expenditure\n• Green Technology Tax Allowance — for solar and energy-efficient equipment\n• MSC Status — for tech companies in Cyberjaya/designated areas' },
      { q: 'What is the Reinvestment Allowance (RA)?', a: 'RA allows manufacturing/agricultural companies to claim 60% of qualifying capital expenditure as an allowance, offset against up to 70% of Statutory Income. Available for 15 years, encouraging Malaysian companies to expand locally.' },
    ]
  },
  {
    id: 'compliance',
    icon: Calendar,
    title: 'Compliance Calendar',
    color: 'red',
    content: [
      { q: 'What are the key annual deadlines?', a: '• CP204 (Tax estimate): 30 days BEFORE start of financial year\n• CP204 monthly instalments: 10th of each month (12 instalments)\n• SOCSO contribution: 15th of following month\n• EPF contribution: 15th of following month\n• PCB (MTD): 15th of following month\n• SST return (Form SST-02): Bi-monthly, last day of following month\n• Form C (annual tax return): 7 months after financial year end' },
      { q: 'What happens if I miss the CP204 deadline?', a: 'Late or non-submission of CP204 attracts a 10% penalty on the estimated tax (Section 107C, ITA 1967). If actual tax exceeds the estimate by more than 30%, a further 10% penalty applies on the shortfall.' },
      { q: 'How long must records be kept?', a: 'Under ITA 1967 and the Companies Act 2016: All accounting records, invoices, receipts, and tax records must be kept for a minimum of 7 years from the date of the transaction or assessment.' },
      { q: 'What is audit risk?', a: 'LHDN conducts field audits and desk audits. High-risk triggers include: large fluctuations in revenue/expenses, unusual deductions, low profitability, and large cash transactions. MYTax\'s immutable audit trail helps demonstrate compliance.' },
    ]
  },
];

export default function HelpCenter() {
  const [active, setActive] = useState('overview');
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const activeSection = SECTIONS.find(s => s.id === active);
  const COLOR = { blue:'var(--accent-2)', gold:'var(--accent-warn)', red:'var(--accent-danger)', green:'var(--accent)', purple:'#8957e5' };

  return (
    <div>
      <div className="page-header">
        <h1>Help Center</h1>
        <p>Complete guide to Malaysian tax law and all MYTax features — YA 2026</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20, alignItems:'start' }}>
        {/* Sidebar nav */}
        <div className="card" style={{ position:'sticky', top:20 }}>
          <div style={{ padding:'12px 16px 6px', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.1em' }}>Topics</div>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button key={s.id} onClick={() => { setActive(s.id); setExpanded({}); }}
                className={`sidebar-item${isActive ? ' active' : ''}`}
                style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:10, fontSize:'0.82rem', borderRadius:6, margin:'1px 8px', width:'calc(100% - 16px)' }}>
                <Icon size={14} />
                {s.title}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {activeSection && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${COLOR[activeSection.color]}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <activeSection.icon size={16} style={{ color: COLOR[activeSection.color] }} />
                  </div>
                  {activeSection.title}
                </h3>
                <span className={`chip chip-${activeSection.color}`}>{activeSection.content.length} topics</span>
              </div>
              <div className="card-body">
                {activeSection.content.map((item, i) => (
                  <div key={i} style={{ borderBottom:'1px solid var(--border-subtle)', overflow:'hidden' }}>
                    <button
                      onClick={() => toggle(`${activeSection.id}-${i}`)}
                      style={{ width:'100%', textAlign:'left', padding:'16px 0', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:`${COLOR[activeSection.color]}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontSize:'0.7rem', fontWeight:700, color: COLOR[activeSection.color] }}>Q</span>
                        </div>
                        <span style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)', textAlign:'left' }}>{item.q}</span>
                      </div>
                      <ChevronRight size={16} style={{ color:'var(--text-muted)', transform: expanded[`${activeSection.id}-${i}`] ? 'rotate(90deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }} />
                    </button>
                    {expanded[`${activeSection.id}-${i}`] && (
                      <div style={{ padding:'0 0 18px 32px', fontSize:'0.85rem', color:'var(--text-muted)', lineHeight:1.8, whiteSpace:'pre-line' }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Reference Card */}
          {active === 'overview' && (
            <div className="card" style={{ marginTop:16 }}>
              <div className="card-header"><h3>2026 Tax Rate Quick Reference</h3></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    { title:'SME CIT', lines:['First RM150k → 15%', 'Next RM450k → 17%', 'Remainder → 24%'], color:'gold' },
                    { title:'Non-SME CIT', lines:['All income → 24%', 'Threshold: no SME conditions', ''], color:'red' },
                    { title:'Service Tax', lines:['Standard → 8%', 'F&B / Telecom → 6%', 'Registration: RM500k'], color:'blue' },
                    { title:'Sales Tax', lines:['Standard goods → 10%', 'Reduced → 5%', 'Exports → 0%'], color:'blue' },
                    { title:'CGT', lines:['Unlisted shares → 10%', 'Bursa listed → Exempt', 'Pay within 60 days'], color:'red' },
                    { title:'Withholding Tax', lines:['Royalties / Tech → 10%', 'Interest → 15%', 'Dividends → 0%'], color:'purple' },
                  ].map(card => (
                    <div key={card.title} style={{ padding:14, background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', borderLeft:`3px solid ${COLOR[card.color]}` }}>
                      <div style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:8, color: COLOR[card.color] }}>{card.title}</div>
                      {card.lines.filter(Boolean).map((l, i) => <div key={i} style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:2 }}>• {l}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
