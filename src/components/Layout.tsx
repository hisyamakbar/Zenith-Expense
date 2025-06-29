import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { PieChart as ChartPie, List, Bot, FolderOpen, Settings, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function Layout() {
  const location = useLocation();
  const { state } = useApp();

  const navItems = [
    { path: '/', icon: ChartPie, label: 'Dashboard' },
    { path: '/transactions', icon: List, label: 'Transactions' },
    { path: '/assistant', icon: Bot, label: 'AI Assistant' },
    { path: '/categories', icon: FolderOpen, label: 'Categories' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isAssistantLocked = !state.isAuthenticated && location.pathname === '/assistant';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-surface border-b border-surface-light">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold text-text font-mono">Zenith Expense</h1>
            {state.defaultCurrency && (
              <p className="text-xs text-text-secondary font-mono">
                Default: {state.defaultCurrency}
              </p>
            )}
          </div>
          <Link
            to="/add-expense"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <div className="w-64 bg-surface border-r border-surface-light min-h-screen">
          <div className="p-6 border-b border-surface-light">
            <h1 className="text-xl font-bold text-text font-mono">Zenith Expense</h1>
            {state.defaultCurrency && (
              <p className="text-sm text-text-secondary font-mono mt-1">
                Default: {state.defaultCurrency}
              </p>
            )}
          </div>
          
          <nav className="p-4 space-y-2">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 font-mono ${
                  location.pathname === path
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:text-text hover:bg-surface-light'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <Link
              to="/add-expense"
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Plus size={16} />
              <span>Add Expense</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 pb-20 lg:pb-0">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light">
        <nav className="flex">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item flex-1 ${
                location.pathname === path ? 'active' : ''
              } ${isAssistantLocked && path === '/assistant' ? 'opacity-50' : ''}`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-mono">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}