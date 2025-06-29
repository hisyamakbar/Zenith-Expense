import React, { useState, useMemo } from 'react';
import { Search, Filter, Edit, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';

export function Transactions() {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return filtered;
  }, [state.expenses, searchTerm, selectedCategory, sortBy, sortOrder]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalAmount = filteredTransactions.reduce((sum, expense) => sum + expense.amount, 0);

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
        <Link to="/add-expense" className="btn-primary flex items-center space-x-2">
          <Plus size={16} />
          <span>Add Expense</span>
        </Link>
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
              {state.categories.map((category) => (
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
                      {transaction.currency_code !== state.defaultCurrency && (
                        <p className="text-xs text-text-muted font-mono">
                          ≈ -{formatCurrency(transaction.amount, state.defaultCurrency || 'USD')}
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
                      <button className="p-2 text-text-muted hover:text-primary transition-colors duration-200">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 text-text-muted hover:text-error transition-colors duration-200">
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