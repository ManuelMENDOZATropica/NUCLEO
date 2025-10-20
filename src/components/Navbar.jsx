import React from 'react';
import { Link } from 'react-router-dom';
import SearchBox from './SearchBox.jsx';
import CategoryMenu from './CategoryMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = ({ onToggleSidebar, onToggleTheme, isDarkMode }) => {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring focus:ring-primary dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
              onClick={onToggleSidebar}
              aria-label="Abrir navegación"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <img src="/logo.svg" alt="NUCLEO" className="h-8 w-8" />
              <span>NUCLEO</span>
            </Link>
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="lg:hidden">
              <SearchBox />
            </div>
            <div className="hidden w-full max-w-md lg:block">
              <SearchBox />
            </div>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              {user ? (
                <div className="hidden text-sm text-slate-600 dark:text-slate-300 lg:block">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{user.email}</span>
                </div>
              ) : null}
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-label="Cambiar tema"
              >
                {isDarkMode ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 18a1 1 0 011 1v2a1 1 0 01-2 0v-2a1 1 0 011-1zm6.364-2.364l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414a1 1 0 011.414-1.414zM6.343 6.343L4.929 4.929A1 1 0 116.343 3.515L7.757 4.93A1 1 0 016.343 6.343zM12 6a1 1 0 01-1-1V3a1 1 0 112 0v2a1 1 0 01-1 1zm7 5h2a1 1 0 110 2h-2a1 1 0 110-2zM3 11h2a1 1 0 010 2H3a1 1 0 010-2zm15.071-6.071l1.414-1.414A1 1 0 0120.9 5.93l-1.414 1.414a1 1 0 01-1.414-1.414zM6.343 17.657l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414a1 1 0 111.414-1.414z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring focus:ring-primary dark:bg-primary dark:hover:bg-primary/80"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <CategoryMenu />
    </>
  );
};

export default Navbar;
