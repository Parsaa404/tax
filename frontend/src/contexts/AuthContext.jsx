import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mytax_user')); } catch { return null; }
  });
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mytax_company')); } catch { return null; }
  });

  const login = (userData, companyData, token) => {
    localStorage.setItem('mytax_token', token);
    localStorage.setItem('mytax_user', JSON.stringify(userData));
    localStorage.setItem('mytax_company', JSON.stringify(companyData));
    setUser(userData);
    setCompany(companyData);
  };

  const logout = () => {
    localStorage.removeItem('mytax_token');
    localStorage.removeItem('mytax_user');
    localStorage.removeItem('mytax_company');
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, setCompany, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
