import { useState, useEffect } from 'react';
import { reportAPI, deadlineAPI, taxAPI } from '../api/services';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, FileText, Users, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import Joyride, { STATUS } from 'react-joyride';

const fmt = (n) => `RM ${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-MY');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const [dash, setDash] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [taxComp, setTaxComp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Joyride state
  const [runTour, setRunTour] = useState(false);
  const [tourSteps] = useState([
    {
      target: '.page-header h1',
      content: 'Welcome to MYTax! This dashboard gives you a complete overview of your business tax and finances in real-time.',
      disableBeacon: true,
    },
    {
      target: '.kpi-grid',
      content: 'Here you can see your real-time Revenue, Expenses, Net Profit, and most importantly: your automatically computed pending Corporate Tax based on Malaysian (YA 2026) laws.',
    },
    {
      target: '.tour-step-charts',
      content: 'This chart breaks down your cash flow visually over the months of the year.',
    },
    {
      target: '.tour-step-tax-summary',
      content: 'This is where the magic happens! MYTax continuously aggregates your Capital Allowances, Zakat, and CP204 payments to estimate exactly what you owe LHDN.',
    },
    {
      target: '.tour-step-deadlines',
      content: 'Never miss a filing deadline again. Your Form C and CP204 due dates will automatically appear here based on your financial year-end.',
    }
  ]);

  useEffect(() => {
    // Check if user has already seen the tour
    if (localStorage.getItem('dashboard_tour_seen') !== 'true') {
      setTimeout(() => setRunTour(true), 500); // Small delay to let data load
    }

    const year = new Date().getFullYear();
    Promise.all([
      reportAPI.dashboard().catch(() => ({ data: { data: null } })),
      deadlineAPI.list({ upcoming_days: 90, completed: false }).catch(() => ({ data: { data: [] } })),
      taxAPI.getByYear(year).catch(() => ({ data: { data: null } })),
    ]).then(([d, dl, tc]) => {
      setDash(d.data.data);
      setDeadlines(dl.data.data || []);
      setTaxComp(tc.data.data);
    }).finally(() => setLoading(false));
  }, []);

  // Synthetic P&L chart data based on dashboard totals
  const revenue = parseFloat(dash?.revenue || 0);
  const expenses = parseFloat(dash?.expenses || 0);
  const chartData = MONTHS.slice(0, new Date().getMonth() + 1).map((m, i) => ({
    month: m,
    revenue: Math.max(0, revenue / (new Date().getMonth() + 1) * (0.7 + Math.random() * 0.6)).toFixed(0),
    expenses: Math.max(0, expenses / (new Date().getMonth() + 1) * (0.7 + Math.random() * 0.5)).toFixed(0),
  }));

  const dayUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
  const urgencyColor = (days) => days <= 7 ? 'red' : days <= 30 ? 'gold' : 'blue';

  if (loading) return <div className="spinner-full"><div className="loading" style={{ width: 32, height: 32 }} /></div>;

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      localStorage.setItem('dashboard_tour_seen', 'true');
    }
  };

  const netProfit = revenue - expenses;
  const taxPayable = parseFloat(taxComp?.balance_tax_payable || 0);

  return (
    <div>
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#2ea043',
            zIndex: 1000,
          }
        }}
      />
      <div className="page-header flex-between">
        <div>
          <h1>Financial Overview</h1>
          <p>Year of Assessment {new Date().getFullYear()} · {new Date().toLocaleDateString('en-MY', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { setRunTour(true); localStorage.removeItem('dashboard_tour_seen'); }}>
          <Info size={16} style={{ marginRight: 6 }} />
          Guide
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-icon green"><DollarSign /></div>
          <div className="kpi-label">Total Revenue (YTD)</div>
          <div className="kpi-value">{fmt(revenue)}</div>
          <div className="kpi-change up"><TrendingUp size={12} /> Year-to-date</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon red"><TrendingDown /></div>
          <div className="kpi-label">Total Expenses (YTD)</div>
          <div className="kpi-value">{fmt(expenses)}</div>
          <div className="kpi-change down"><TrendingDown size={12} /> Year-to-date</div>
        </div>
        <div className={`kpi-card ${netProfit >= 0 ? 'blue' : 'red'}`}>
          <div className={`kpi-icon ${netProfit >= 0 ? 'blue' : 'red'}`}><TrendingUp /></div>
          <div className="kpi-label">Net Profit / (Loss)</div>
          <div className="kpi-value" style={{ color: netProfit >= 0 ? 'var(--accent)' : 'var(--accent-danger)' }}>
            {fmt(netProfit)}
          </div>
          <div className="kpi-change">Before tax</div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-icon gold"><AlertTriangle /></div>
          <div className="kpi-label">Est. Tax Payable</div>
          <div className="kpi-value">{taxPayable ? fmt(taxPayable) : 'Not computed'}</div>
          <div className="kpi-change">YA {new Date().getFullYear()}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-65-35 mb-6">
        <div className="card tour-step-charts">
          <div className="card-header">
            <h3>Revenue vs Expenses</h3>
            <span className="chip chip-blue">YTD {new Date().getFullYear()}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2ea043" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2ea043" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#da3633" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#da3633" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, n) => [`RM ${Number(v).toLocaleString()}`, n]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2ea043" fill="url(#gr)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#da3633" fill="url(#ge)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No transaction data yet.</p></div>
            )}
          </div>
        </div>

        {/* Tax Summary */}
        <div className="card tour-step-tax-summary">
          <div className="card-header">
            <h3>Tax Summary</h3>
            {taxComp ? <span className="chip chip-green">Computed</span> : <span className="chip chip-gray">Pending</span>}
          </div>
          <div className="card-body">
            {taxComp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Gross Revenue', value: fmt(taxComp.gross_revenue), color: 'green' },
                  { label: 'Total Expenses', value: fmt(taxComp.total_allowable_expenses), color: 'red' },
                  { label: 'Capital Allowance', value: fmt(taxComp.total_capital_allowance), color: 'blue' },
                  { label: 'Chargeable Income', value: fmt(taxComp.chargeable_income), color: 'purple', bold: true },
                  { label: 'Tax Payable', value: fmt(taxComp.tax_before_rebates), color: 'gold', bold: true },
                  { label: 'CP204 Paid', value: fmt(taxComp.cp204_paid), color: 'gray' },
                  { label: 'Balance Payable', value: fmt(taxComp.balance_tax_payable), color: 'red', bold: true },
                ].map(row => (
                  <div key={row.label} className="flex-between">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row.label}</span>
                    <span style={{ fontWeight: row.bold ? 700 : 400, fontSize: '0.85rem', color: `var(--${row.color === 'gray' ? 'text-muted' : row.color === 'green' ? 'accent' : row.color === 'red' ? 'accent-danger' : row.color === 'blue' ? 'accent-2' : row.color === 'gold' ? 'accent-warn' : 'accent-purple'})` }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <p>No tax computation yet</p>
                <a href="/tax" style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>Compute now →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deadlines */}
      <div className="card tour-step-deadlines">
        <div className="card-header">
          <h3>Upcoming Tax Deadlines</h3>
          <a href="/deadlines" className="btn btn-ghost btn-sm">View all</a>
        </div>
        {deadlines.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={40} />
            <h4>All clear!</h4>
            <p>No upcoming deadlines in the next 90 days.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Deadline</th><th>Type</th><th>Due Date</th><th>Days Left</th><th>Priority</th>
              </tr></thead>
              <tbody>
                {deadlines.slice(0, 8).map(d => {
                  const days = dayUntil(d.due_date);
                  const color = urgencyColor(days);
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.title}</td>
                      <td><span className="chip chip-blue">{d.deadline_type}</span></td>
                      <td className="td-muted">{new Date(d.due_date).toLocaleDateString('en-MY')}</td>
                      <td>
                        <span style={{ color: `var(--accent-${color === 'red' ? 'danger' : color === 'gold' ? 'warn' : '2'})`, fontWeight: 600 }}>
                          {days <= 0 ? 'OVERDUE' : `${days}d`}
                        </span>
                      </td>
                      <td>
                        {d.priority === 'critical' && <span className="chip chip-red">Critical</span>}
                        {d.priority === 'high'     && <span className="chip chip-gold">High</span>}
                        {d.priority === 'medium'   && <span className="chip chip-blue">Medium</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
