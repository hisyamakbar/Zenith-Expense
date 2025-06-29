import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { SplashScreen } from './components/SplashScreen';
import { CurrencySelector } from './components/CurrencySelector';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { AIAssistant } from './components/AIAssistant';
import { Categories } from './components/Categories';
import { Settings } from './components/Settings';
import { AddExpense } from './components/AddExpense';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { state } = useApp();

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleCurrencySelected = () => {
    // Currency selection is handled in the CurrencySelector component
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!state.hasSelectedCurrency) {
    return <CurrencySelector onCurrencySelected={handleCurrencySelected} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
          <Route path="add-expense" element={<AddExpense />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;