
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegistrationPage from './pages/RegistrationPage';
import { UserSession } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'register'>('login');
  const [session, setSession] = useState<UserSession | null>(null);

  // Persistence logic (optional, for development convenience)
  useEffect(() => {
    const savedSession = localStorage.getItem('sports_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setSession(parsed);
      setCurrentPage('dashboard');
    }
  }, []);

  const handleLogin = (schoolId: string, schoolName: string) => {
    const newSession = { schoolId, schoolName, isLoggedIn: true };
    setSession(newSession);
    setCurrentPage('dashboard');
    localStorage.setItem('sports_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentPage('login');
    localStorage.removeItem('sports_session');
  };

  const renderPage = () => {
    if (!session || currentPage === 'login') {
      return <LoginPage onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage 
            session={session} 
            onNavigate={(path) => setCurrentPage(path as any)} 
          />
        );
      case 'register':
        return (
          <RegistrationPage 
            schoolName={session.schoolName}
            onBack={() => setCurrentPage('dashboard')} 
          />
        );
      default:
        return <DashboardPage session={session} onNavigate={(path) => setCurrentPage(path as any)} />;
    }
  };

  return (
    <Layout 
      session={session} 
      onLogout={handleLogout} 
      onNavigate={(path) => setCurrentPage(path as any)}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;
