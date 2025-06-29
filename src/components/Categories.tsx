import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Lock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Food & Dining', is_default: true },
  { id: 2, name: 'Transportation', is_default: true },
  { id: 3, name: 'Shopping', is_default: true },
  { id: 4, name: 'Entertainment', is_default: true },
  { id: 5, name: 'Bills & Utilities', is_default: true },
  { id: 6, name: 'Healthcare', is_default: true },
  { id: 7, name: 'Travel', is_default: true },
  { id: 8, name: 'Education', is_default: true },
];

export function Categories() {
  const { state } = useApp();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Combine default categories with user categories for display
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...state.categories.filter(cat => !cat.is_default)
  ];

  const userCustomCategories = state.categories.filter(cat => !cat.is_default);
  const isBasicUser = !state.isAuthenticated || state.user?.subscription_tier === 'basic';
  const canAddMore = !isBasicUser || userCustomCategories.length < 2;

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    // In a real app, this would call the API
    console.log('Adding category:', newCategoryName);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleEditCategory = (id: number) => {
    setEditingCategory(id);
    const category = allCategories.find(cat => cat.id === id);
    setEditCategoryName(category?.name || '');
  };

  const handleUpdateCategory = () => {
    if (!editCategoryName.trim()) return;
    
    // In a real app, this would call the API
    console.log('Updating category:', editingCategory, editCategoryName);
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategory = (id: number) => {
    // In a real app, this would call the API
    console.log('Deleting category:', id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text font-mono">Categories</h1>
          <p className="text-text-secondary font-mono">
            Organize your expenses with custom categories
          </p>
        </div>
        
        {canAddMore && (
          <button
            onClick={() => setIsAddingCategory(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Plan Limitations Info */}
      {isBasicUser && (
        <div className="card border-accent/20 bg-accent/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <Lock size={16} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text font-mono">
                {state.isAuthenticated ? 'Basic Plan Limits' : 'Sign Up Required'}
              </h3>
              <p className="text-text-secondary font-mono text-sm">
                {state.isAuthenticated 
                  ? `Basic users can create up to 2 custom categories (${userCustomCategories.length}/2 used). Upgrade to Pro for unlimited categories.`
                  : 'Sign up to create custom expense categories and unlock AI features.'
                }
              </p>
            </div>
            <button className="btn-accent">
              {state.isAuthenticated ? 'Upgrade to Pro' : 'Sign Up'}
            </button>
          </div>
        </div>
      )}

      {/* Add Category Form */}
      {isAddingCategory && (
        <div className="card">
          <h3 className="font-semibold text-text font-mono mb-4">Add New Category</h3>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              className="input flex-1"
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              className="btn-primary"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingCategory(false);
                setNewCategoryName('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCategories.map((category) => (
          <div 
            key={category.id}
            className={`card transition-all duration-200 ${
              category.is_default 
                ? 'border-surface-light' 
                : 'border-primary/20 hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  category.is_default ? 'bg-surface-light' : 'bg-primary/10'
                }`}>
                  <FolderOpen 
                    size={20} 
                    className={category.is_default ? 'text-text-muted' : 'text-primary'} 
                  />
                </div>
                
                {editingCategory === category.id ? (
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="input text-sm"
                    onBlur={handleUpdateCategory}
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory()}
                    autoFocus
                  />
                ) : (
                  <div>
                    <h3 className="font-semibold text-text font-mono">
                      {category.name}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono">
                      {category.is_default ? 'Default' : 'Custom'}
                    </p>
                  </div>
                )}
              </div>
              
              {!category.is_default && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditCategory(category.id)}
                    className="p-2 text-text-muted hover:text-primary transition-colors duration-200"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 text-text-muted hover:text-error transition-colors duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Category usage stats could go here */}
            <div className="mt-3 pt-3 border-t border-surface-light">
              <p className="text-xs text-text-muted font-mono">
                {Math.floor(Math.random() * 20)} expenses this month
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}