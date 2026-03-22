import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Tax from './pages/Tax';
import Payroll from './pages/Payroll';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import Assets from './pages/Assets';
import AI from './pages/AI';
import Deadlines from './pages/Deadlines';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index          element={<Dashboard />} />
        <Route path="accounts"     element={<Accounts />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="tax"          element={<Tax />} />
        <Route path="payroll"      element={<Payroll />} />
        <Route path="invoices"     element={<Invoices />} />
        <Route path="expenses"     element={<Expenses />} />
        <Route path="assets"       element={<Assets />} />
        <Route path="reports"      element={<Reports />} />
        <Route path="ai"           element={<AI />} />
        <Route path="deadlines"    element={<Deadlines />} />
        <Route path="settings"     element={<Settings />} />
        <Route path="help"         element={<HelpCenter />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
