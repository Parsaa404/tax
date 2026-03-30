import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, ArrowLeftRight, Calculator,
  Users, FileText, ShoppingBag, Package, BarChart3,
  Sparkles, Calendar, Settings, LogOut, Building2, HelpCircle
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { to: '/',           label: 'Dashboard',     icon: LayoutDashboard },
    { to: '/deadlines',  label: 'Tax Deadlines', icon: Calendar },
    { to: '/ai',         label: 'AI Insights',   icon: Sparkles },
    { to: '/help',       label: 'Help Center',   icon: HelpCircle },
  ]},
  { section: 'Accounting', items: [
    { to: '/accounts',     label: 'Chart of Accounts', icon: BookOpen },
    { to: '/transactions', label: 'Transactions',       icon: ArrowLeftRight },
    { to: '/expenses',     label: 'Expenses',           icon: ShoppingBag },
    { to: '/assets',       label: 'Fixed Assets',       icon: Package },
  ]},
  { section: 'Tax & Payroll', items: [
    { to: '/tax',     label: 'Tax Engine',  icon: Calculator },
    { to: '/payroll', label: 'Payroll',     icon: Users },
  ]},
  { section: 'Billing', items: [
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/invoices',  label: 'Invoices',  icon: FileText },
    { to: '/reports',   label: 'Reports',   icon: BarChart3 },
  ]},
];

export default function Layout() {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const pageTitle = (pathname) => {
    const map = {
      '/': 'Dashboard', '/accounts': 'Chart of Accounts', '/transactions': 'Transactions',
      '/tax': 'Tax Engine', '/payroll': 'Payroll', '/customers': 'Customers', '/invoices': 'Invoices',
      '/expenses': 'Expenses', '/assets': 'Fixed Assets', '/reports': 'Reports',
      '/ai': 'AI Insights', '/deadlines': 'Tax Deadlines', '/settings': 'Settings', '/help': 'Help Center',
    };
    return map[pathname] || 'MYTax';
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">MY</div>
          <div>
            <div style={{ fontWeight: 700, fontSize:'1rem' }}>MYTax</div>
            <div className="logo-sub">Malaysian Tax System</div>
          </div>
        </div>

        {navItems.map((section) => (
          <div className="sidebar-section" key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <button className="sidebar-item" onClick={() => navigate('/settings')}>
            <Settings size={16} /> Settings
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="avatar">{user?.name?.[0] || 'U'}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-role">{user?.role} · {company?.name?.split(' ')[0]}</div>
            </div>
            <LogOut size={14} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-breadcrumb">
          <h2>{pageTitle(location.pathname)}</h2>
          <p>{company?.name}</p>
        </div>
        <div className="topbar-actions">
          <div className="topbar-pill">
            <Building2 size={12} />
            {company?.company_type || 'Sdn Bhd'}
          </div>
          <div className="topbar-pill">
            <div className="dot" />
            {company?.is_sme ? 'SME' : 'Non-SME'} · YA {new Date().getFullYear()}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
