import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import Login from './Login.jsx';
import CreationMenu from './CreationMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Layout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('nucleo-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('nucleo-theme');
    if (saved) {
      setIsDarkMode(saved === 'dark');
    }
  }, []);

  const toggleSidebar = () => setIsSidebarOpen((value) => !value);
  const toggleTheme = () => setIsDarkMode((value) => !value);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar onToggleSidebar={toggleSidebar} onToggleTheme={toggleTheme} isDarkMode={isDarkMode} />
      <CreationMenu />
      <div className="mx-auto flex max-w-6xl flex-1 gap-6 px-4 py-10 lg:px-6">
        <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
