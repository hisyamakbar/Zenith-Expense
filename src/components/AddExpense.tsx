import React, { useState } from 'react';
import { Save, X, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';

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

export function AddExpense() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    item_service: '',
    amount: '',
    currency_code: state.defaultCurrency || 'USD',
    category_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allCategories = [...DEFAULT_CATEGORIES, ...state.categories.filter(cat => !cat.is_default)];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_service || !formData.amount || !formData.category_id) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the expense object
      const newExpense = {
        id: Date.now(), // Temporary ID for local state
        user_id: state.user?.id || 'local',
        category_id: parseInt(formData.category_id),
        item_service: formData.item_service,
        amount: parseFloat(formData.amount),
        currency_code: formData.currency_code,
        expense_date: formData.expense_date,
        note: formData.note || undefined,
        created_at: new Date().toISOString(),
        category: allCategories.find(cat => cat.id.toString() === formData.category_id)
      };

      // Add to local state
      dispatch({ type: 'ADD_EXPENSE', payload: newExpense as any });

      // In a real app, this would also sync to Supabase if authenticated
      if (state.isAuthenticated) {
        console.log('Would sync to Supabase:', newExpense);
      }

      navigate('/transactions');
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.item_service && formData.amount && formData.category_id;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text font-mono">Add Expense</h1>
          <p className="text-text-secondary font-mono">
            Record a new expense transaction
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary flex items-center space-x-2"
        >
          <X size={16} />
          <span>Cancel</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item/Service */}
        <div className="card">
          <label className="block text-sm font-medium text-text font-mono mb-3">
            <div className="flex items-center space-x-2">
              <Tag size={16} />
              <span>Item / Service</span>
            </div>
          </label>
          <input
            type="text"
            value={formData.item_service}
            onChange={(e) => handleInputChange('item_service', e.target.value)}
            placeholder="e.g., Coffee at Starbucks, Uber ride, Groceries"
            className="input"
            required
          />
        </div>

        {/* Amount and Currency */}
        <div className="card">
          <label className="block text-sm font-medium text-text font-mono mb-3">
            <div className="flex items-center space-x-2">
              <DollarSign size={16} />
              <span>Amount</span>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              className="input"
              required
            />
            <select
              value={formData.currency_code}
              onChange={(e) => handleInputChange('currency_code', e.target.value)}
              className="input"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="IDR">IDR (Rp)</option>
              <option value="SGD">SGD (S$)</option>
            </select>
          </div>
        </div>

        {/* Category */}
        <div className="card">
          <label className="block text-sm font-medium text-text font-mono mb-3">
            <div className="flex items-center space-x-2">
              <Tag size={16} />
              <span>Category</span>
            </div>
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => handleInputChange('category_id', e.target.value)}
            className="input"
            required
          >
            <option value="">Select a category</option>
            {allCategories.map((category) => (
              <option key={category.id} value={category.id.toString()}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="card">
          <label className="block text-sm font-medium text-text font-mono mb-3">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>Date</span>
            </div>
          </label>
          <input
            type="date"
            value={formData.expense_date}
            onChange={(e) => handleInputChange('expense_date', e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Note */}
        <div className="card">
          <label className="block text-sm font-medium text-text font-mono mb-3">
            <div className="flex items-center space-x-2">
              <FileText size={16} />
              <span>Note (Optional)</span>
            </div>
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => handleInputChange('note', e.target.value)}
            placeholder="Add any additional details..."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`btn flex-1 flex items-center justify-center space-x-2 ${
              isFormValid && !isSubmitting
                ? 'btn-primary'
                : 'bg-surface-light text-text-muted cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            <span>{isSubmitting ? 'Saving...' : 'Save Expense'}</span>
          </button>
        </div>
      </form>

      {/* Quick Tips */}
      <div className="card mt-6 border-primary/20 bg-primary/5">
        <h3 className="font-semibold text-text font-mono mb-3">💡 Quick Tips</h3>
        <ul className="text-sm text-text-secondary font-mono space-y-2">
          <li>• Be specific with item names for better tracking</li>
          <li>• Use the original currency for accurate records</li>
          <li>• Add notes for tax-deductible or important expenses</li>
          {state.isAuthenticated && (
            <li>• Try the AI Assistant for voice expense entry</li>
          )}
        </ul>
      </div>
    </div>
  );
}