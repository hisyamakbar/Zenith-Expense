import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Edit, Trash2, Plus, Save, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';
import { convertCurrency, formatCurrency as formatCurrencyWithSymbol, clearRateCache } from '../lib/currencyApi';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Food & Dining' },
  { id: 2, name: 'Transportation' },
  { id: 3, name: 'Shopping' },
  { id: 4, name: 'Entertainment' },
  { id: 5, name: 'Bills & Utilities' },
  { id: 6, name: 'Healthcare' },
  { id: 7, name: 'Travel' },
  { id: 8, name: 'Education' },
];

export function Transactions() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null);
  const [convertedExpenses, setConvertedExpenses] = useState<any[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    item_service: '',
    amount: '',
    currency_code: '',
    category_id: '',
    expense_date: '',
    note: ''
  });

  const allCategories = [...DEFAULT_CATEGORIES, ...state.categories.filter(cat => !cat.is_default)];

  // Convert all expenses to default currency for display
  useEffect(() => {
    const convertExpenses = async () => {
      if (!state.defaultCurrency || state.expenses.length === 0) return;
      
      setIsConverting(true);
      setConversionError(null);
      
      try {
        const converted = await Promise.all(
          state.expenses.map(async (expense) => {
            if (expense.currency_code === state.defaultCurrency) {
              return { ...expense, convertedAmount: expense.amount };
            }
            
            try {
              const conversion = await convertCurrency(
                expense.amount,
                expense.currency_code,
                state.defaultCurrency!
              );
              
              return { ...expense, convertedAmount: conversion.convertedAmount };
            } catch (error) {
              console.error(`Error converting ${expense.currency_code} to ${state.defaultCurrency}:`, error);
              // Return original amount as fallback
              return { ...expense, convertedAmount: expense.amount };
            }
          })
        );
        setConvertedExpenses(converted);
      } catch (error) {
        console.error('Error converting currencies:', error);
        setConversionError('Failed to convert currencies. Showing original amounts.');
        setConvertedExpenses(state.expenses.map(exp => ({ ...exp, convertedAmount: exp.amount })));
      } finally {
        setIsConverting(false);
      }
    };

    convertExpenses();
  }, [state.expenses, state.defaultCurrency]);

  const filteredTransactions = useMemo(() => {
    const expensesToUse = convertedExpenses.length > 0 ? convertedExpenses : state.expenses;
    let filtered = [...expensesToUse];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.item_service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.note?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(expense => 
        expense.category_id.toString() === selectedCategory
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.expense_date).getTime();
        const dateB = new Date(b.expense_date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const amountA = a.convertedAmount || a.amount;
        const amountB = b.convertedAmount || b.amount;
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      }
    });

    return filtered;
  }, [convertedExpenses, state.expenses, searchTerm, selectedCategory, sortBy, sortOrder]);

  const formatCurrency = (amount: number, currency: string) => {
    return formatCurrencyWithSymbol(amount, currency);
  };

  const totalAmount = filteredTransactions.reduce((sum, expense) => 
    sum + (expense.convertedAmount || expense.amount), 0
  );

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction.id);
    setEditForm({
      item_service: transaction.item_service,
      amount: transaction.amount.toString(),
      currency_code: transaction.currency_code,
      category_id: transaction.category_id.toString(),
      expense_date: transaction.expense_date,
      note: transaction.note || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.item_service || !editForm.amount || !editForm.category_id) {
      return;
    }

    const originalTransaction = state.expenses.find(exp => exp.id === editingTransaction)!;
    const updatedTransaction = {
      ...originalTransaction,
      item_service: editForm.item_service,
      amount: parseFloat(editForm.amount),
      currency_code: editForm.currency_code,
      category_id: parseInt(editForm.category_id),
      expense_date: editForm.expense_date,
      note: editForm.note || undefined,
      category: allCategories.find(cat => cat.id.toString() === editForm.category_id)
    };

    dispatch({ type: 'UPDATE_EXPENSE', payload: updatedTransaction });
    
    // If currency changed, trigger conversion update
    if (originalTransaction.currency_code !== editForm.currency_code || 
        originalTransaction.amount !== parseFloat(editForm.amount)) {
      setIsConverting(true);
      try {
        if (editForm.currency_code === state.defaultCurrency) {
          // No conversion needed
          setConvertedExpenses(prev => 
            prev.map(exp => 
              exp.id === editingTransaction 
                ? { ...updatedTransaction, convertedAmount: updatedTransaction.amount }
                : exp
            )
          );
        } else {
          // Convert to default currency
          const conversion = await convertCurrency(
            updatedTransaction.amount,
            updatedTransaction.currency_code,
            state.defaultCurrency!
          );
          
          setConvertedExpenses(prev => 
            prev.map(exp => 
              exp.id === editingTransaction 
                ? { ...updatedTransaction, convertedAmount: conversion.convertedAmount }
                : exp
            )
          );
        }
      } catch (error) {
        console.error('Error converting updated transaction:', error);
        // Use original amount as fallback
        setConvertedExpenses(prev => 
          prev.map(exp => 
            exp.id === editingTransaction 
              ? { ...updatedTransaction, convertedAmount: updatedTransaction.amount }
              : exp
          )
        );
      } finally {
        setIsConverting(false);
      }
    }

    setEditingTransaction(null);
    setEditForm({
      item_service: '',
      amount: '',
      currency_code: '',
      category_id: '',
      expense_date: '',
      note: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditForm({
      item_service: '',
      amount: '',
      currency_code: '',
      category_id: '',
      expense_date: '',
      note: ''
    });
  };

  const handleDeleteTransaction = (id: number) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
      // Remove from converted expenses as well
      setConvertedExpenses(prev => prev.filter(exp => exp.id !== id));
    }
  };

  const handleRefreshRates = async () => {
    setIsConverting(true);
    setConversionError(null);
    
    // Clear cache to force fresh rates
    clearRateCache();
    
    try {
      const converted = await Promise.all(
        state.expenses.map(async (expense) => {
          if (expense.currency_code === state.defaultCurrency) {
            return { ...expense, convertedAmount: expense.amount };
          }
          
          const conversion = await convertCurrency(
            expense.amount,
            expense.currency_code,
            state.defaultCurrency!
          );
          
          return { ...expense, convertedAmount: conversion.convertedAmount };
        })
      );
      setConvertedExpenses(converted);
    } catch (error) {
      console.error('Error refreshing exchange rates:', error);
      setConversionError('Failed to refresh exchange rates. Using cached rates.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text font-mono">Transactions</h1>
          <p className="text-text-secondary font-mono">
            {filteredTransactions.length} transactions • Total: {formatCurrency(totalAmount, state.defaultCurrency || 'USD')}
            {isConverting && (
              <span className="ml-2 text-accent text-sm">• Converting...</span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshRates}
            disabled={isConverting}
            className="btn-secondary flex items-center space-x-2"
            title="Refresh exchange rates"
          >
            <RefreshCw size={16} className={isConverting ? 'animate-spin' : ''} />
            <span>Refresh Rates</span>
          </button>
          <Link to="/add-expense" className="btn-primary flex items-center space-x-2">
            <Plus size={16} />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      {/* Conversion Error Alert */}
      {conversionError && (
        <div className="card border-error/20 bg-error/5">
          <div className="flex items-center space-x-3">
            <AlertCircle size={20} className="text-error flex-shrink-0" />
            <div>
              <p className="text-error font-mono font-semibold">Currency Conversion Issue</p>
              <p className="text-text-secondary font-mono text-sm">{conversionError}</p>
            </div>
            <button
              onClick={handleRefreshRates}
              className="btn-secondary ml-auto"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input pl-10 appearance-none"
            >
              <option value="">All Categories</option>
              {allCategories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="input flex-1"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn-secondary px-3"
              title={`Currently sorting ${sortOrder === 'desc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="card hover:bg-surface-light transition-colors duration-200"
            >
              {editingTransaction === transaction.id ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text font-mono mb-2">
                        Item/Service
                      </label>
                      <input
                        type="text"
                        value={editForm.item_service}
                        onChange={(e) => setEditForm(prev => ({ ...prev, item_service: e.target.value }))}
                        className="input"
                        placeholder="Item or service name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text font-mono mb-2">
                        Amount & Currency
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="input flex-1"
                          placeholder="0.00"
                        />
                        <select
                          value={editForm.currency_code}
                          onChange={(e) => setEditForm(prev => ({ ...prev, currency_code: e.target.value }))}
                          className="input w-24"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="JPY">JPY</option>
                          <option value="IDR">IDR</option>
                          <option value="SGD">SGD</option>
                          <option value="AUD">AUD</option>
                          <option value="CAD">CAD</option>
                          <option value="CNY">CNY</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text font-mono mb-2">
                        Category
                      </label>
                      <select
                        value={editForm.category_id}
                        onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="input"
                      >
                        <option value="">Select category</option>
                        {allCategories.map((category) => (
                          <option key={category.id} value={category.id.toString()}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text font-mono mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editForm.expense_date}
                        onChange={(e) => setEditForm(prev => ({ ...prev, expense_date: e.target.value }))}
                        className="input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text font-mono mb-2">
                      Note (Optional)
                    </label>
                    <textarea
                      value={editForm.note}
                      onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                      className="input resize-none"
                      rows={2}
                      placeholder="Add a note..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveEdit}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Save size={16} />
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-text font-mono truncate">
                        {transaction.item_service}
                      </h3>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-text font-mono">
                          -{formatCurrency(transaction.amount, transaction.currency_code)}
                        </p>
                        {transaction.currency_code !== state.defaultCurrency && transaction.convertedAmount && (
                          <p className="text-xs text-text-muted font-mono">
                            ≈ -{formatCurrency(transaction.convertedAmount, state.defaultCurrency || 'USD')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4 text-text-secondary font-mono">
                        <span>{format(new Date(transaction.expense_date), 'MMM dd, yyyy')}</span>
                        {transaction.category && (
                          <span className="text-accent">• {transaction.category.name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-2 text-text-muted hover:text-primary transition-colors duration-200"
                          title="Edit transaction"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-2 text-text-muted hover:text-error transition-colors duration-200"
                          title="Delete transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {transaction.note && (
                      <p className="text-sm text-text-secondary font-mono mt-2 italic">
                        "{transaction.note}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <p className="text-text-secondary font-mono text-lg mb-4">
              No transactions found
            </p>
            <p className="text-text-muted font-mono text-sm mb-6">
              {searchTerm || selectedCategory 
                ? 'Try adjusting your filters' 
                : 'Start by adding your first expense'
              }
            </p>
            <Link to="/add-expense" className="btn-primary">
              Add Expense
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}