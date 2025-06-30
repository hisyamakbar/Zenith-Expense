import React, { useState, useMemo } from 'react';
import { Search, Filter, Edit, Trash2, Plus, Save, X, RefreshCw, AlertCircle, DollarSign } from 'lucide-react';
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
  const [editForm, setEditForm] = useState({
    item_service: '',
    amount: '',
    currency_code: '',
    category_id: '',
    expense_date: '',
    note: '',
    converted_amount: '',
    manual_conversion: false
  });

  const allCategories = [...DEFAULT_CATEGORIES, ...state.categories.filter(cat => !cat.is_default)];

  const filteredTransactions = useMemo(() => {
    let filtered = [...state.expenses];

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
        // Use converted amount for sorting if available, otherwise original amount
        const amountA = a.converted_amount || a.amount;
        const amountB = b.converted_amount || b.amount;
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      }
    });

    return filtered;
  }, [state.expenses, searchTerm, selectedCategory, sortBy, sortOrder]);

  const formatCurrency = (amount: number, currency: string) => {
    return formatCurrencyWithSymbol(amount, currency);
  };

  // Calculate total using preserved conversion data
  const totalAmount = filteredTransactions.reduce((sum, expense) => {
    if (expense.currency_code === state.defaultCurrency) {
      return sum + expense.amount;
    }
    // Use preserved converted amount if available
    return sum + (expense.converted_amount || expense.amount);
  }, 0);

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction.id);
    setEditForm({
      item_service: transaction.item_service,
      amount: transaction.amount.toString(),
      currency_code: transaction.currency_code,
      category_id: transaction.category_id.toString(),
      expense_date: transaction.expense_date,
      note: transaction.note || '',
      converted_amount: transaction.converted_amount?.toString() || '',
      manual_conversion: transaction.manual_conversion || false
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.item_service || !editForm.amount || !editForm.category_id) {
      return;
    }

    const originalTransaction = state.expenses.find(exp => exp.id === editingTransaction)!;
    
    // Determine if we need to update conversion
    let conversionData = {
      converted_amount: originalTransaction.converted_amount,
      conversion_rate: originalTransaction.conversion_rate,
      conversion_date: originalTransaction.conversion_date,
      manual_conversion: originalTransaction.manual_conversion
    };

    // If currency or amount changed, or if manual conversion was provided
    if (originalTransaction.currency_code !== editForm.currency_code || 
        originalTransaction.amount !== parseFloat(editForm.amount) ||
        editForm.converted_amount !== (originalTransaction.converted_amount?.toString() || '')) {
      
      if (editForm.converted_amount && editForm.converted_amount !== '') {
        // Manual conversion provided
        conversionData = {
          converted_amount: parseFloat(editForm.converted_amount),
          conversion_rate: parseFloat(editForm.converted_amount) / parseFloat(editForm.amount),
          conversion_date: new Date().toISOString(),
          manual_conversion: true
        };
      } else if (editForm.currency_code !== state.defaultCurrency) {
        // Auto conversion needed
        try {
          const conversion = await convertCurrency(
            parseFloat(editForm.amount),
            editForm.currency_code,
            state.defaultCurrency!
          );
          
          conversionData = {
            converted_amount: conversion.convertedAmount,
            conversion_rate: conversion.exchangeRate,
            conversion_date: new Date().toISOString(),
            manual_conversion: false
          };
        } catch (error) {
          console.error('Error converting currency:', error);
          // Keep original conversion data if conversion fails
        }
      } else {
        // Same currency as default, no conversion needed
        conversionData = {
          converted_amount: undefined,
          conversion_rate: undefined,
          conversion_date: undefined,
          manual_conversion: false
        };
      }
    }

    const updatedTransaction = {
      ...originalTransaction,
      item_service: editForm.item_service,
      amount: parseFloat(editForm.amount),
      currency_code: editForm.currency_code,
      category_id: parseInt(editForm.category_id),
      expense_date: editForm.expense_date,
      note: editForm.note || undefined,
      category: allCategories.find(cat => cat.id.toString() === editForm.category_id),
      ...conversionData
    };

    dispatch({ type: 'UPDATE_EXPENSE', payload: updatedTransaction });
    setEditingTransaction(null);
    setEditForm({
      item_service: '',
      amount: '',
      currency_code: '',
      category_id: '',
      expense_date: '',
      note: '',
      converted_amount: '',
      manual_conversion: false
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
      note: '',
      converted_amount: '',
      manual_conversion: false
    });
  };

  const handleDeleteTransaction = (id: number) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
    }
  };

  const handleRefreshRates = () => {
    clearRateCache();
    alert('Exchange rate cache cleared. New rates will be fetched for future conversions.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text font-mono">Transactions</h1>
          <p className="text-text-secondary font-mono">
            {filteredTransactions.length} transactions • Total: {formatCurrency(totalAmount, state.defaultCurrency || 'USD')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshRates}
            className="btn-secondary flex items-center space-x-2"
            title="Clear exchange rate cache"
          >
            <RefreshCw size={16} />
            <span>Clear Rate Cache</span>
          </button>
          <Link to="/add-expense" className="btn-primary flex items-center space-x-2">
            <Plus size={16} />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

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
                  
                  {/* Manual Conversion Override */}
                  {editForm.currency_code !== state.defaultCurrency && (
                    <div className="card border-accent/20 bg-accent/5">
                      <div className="flex items-center space-x-2 mb-3">
                        <DollarSign size={16} className="text-accent" />
                        <label className="text-sm font-medium text-text font-mono">
                          Manual Conversion Override (Optional)
                        </label>
                      </div>
                      <div className="flex space-x-3">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.converted_amount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, converted_amount: e.target.value }))}
                          className="input flex-1"
                          placeholder={`Amount in ${state.defaultCurrency}`}
                        />
                        <span className="flex items-center text-text-secondary font-mono">
                          {state.defaultCurrency}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted font-mono mt-2">
                        Leave empty for automatic conversion. Manual values override exchange rates.
                      </p>
                    </div>
                  )}
                  
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
                        {transaction.currency_code !== state.defaultCurrency && transaction.converted_amount && (
                          <div className="text-xs text-text-muted font-mono">
                            <p>≈ -{formatCurrency(transaction.converted_amount, state.defaultCurrency || 'USD')}</p>
                            {transaction.manual_conversion && (
                              <span className="text-accent">• Manual</span>
                            )}
                            {transaction.conversion_date && (
                              <p className="text-xs">
                                Rate from {format(new Date(transaction.conversion_date), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
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