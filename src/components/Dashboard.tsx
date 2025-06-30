import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ArrowRight,
  Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { formatCurrency as formatCurrencyWithSymbol } from '../lib/currencyApi';

export function Dashboard() {
  const { state } = useApp();

  const dashboardData = useMemo(() => {
    const now = new Date();
    const thisMonth = {
      start: startOfMonth(now),
      end: endOfMonth(now)
    };
    const lastMonth = {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1))
    };
    const thisWeek = {
      start: startOfWeek(now),
      end: endOfWeek(now)
    };

    // Filter expenses by periods
    const thisMonthExpenses = state.expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate >= thisMonth.start && expenseDate <= thisMonth.end;
    });

    const lastMonthExpenses = state.expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate >= lastMonth.start && expenseDate <= lastMonth.end;
    });

    const thisWeekExpenses = state.expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate >= thisWeek.start && expenseDate <= thisWeek.end;
    });

    // Calculate totals using preserved conversion data
    const calculateTotal = (expenses: any[]) => {
      return expenses.reduce((sum, expense) => {
        if (expense.currency_code === state.defaultCurrency) {
          return sum + expense.amount;
        }
        // Use preserved converted amount if available
        return sum + (expense.converted_amount || expense.amount);
      }, 0);
    };

    const thisMonthTotal = calculateTotal(thisMonthExpenses);
    const lastMonthTotal = calculateTotal(lastMonthExpenses);
    const thisWeekTotal = calculateTotal(thisWeekExpenses);

    // Calculate change percentage
    const monthlyChange = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    // Recent transactions (last 5)
    const recentTransactions = [...state.expenses]
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
      .slice(0, 5);

    return {
      thisMonthTotal,
      thisWeekTotal,
      monthlyChange,
      recentTransactions,
      totalTransactions: state.expenses.length
    };
  }, [state.expenses, state.defaultCurrency]);

  const formatCurrency = (amount: number) => {
    return formatCurrencyWithSymbol(amount, state.defaultCurrency || 'USD');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text font-mono">Dashboard</h1>
          <p className="text-text-secondary font-mono">
            {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </p>
        </div>
        {state.isAuthenticated && (
          <div className="text-right">
            <div className="flex items-center space-x-2">
              {state.user?.subscription_tier === 'pro' && (
                <Crown size={16} className="text-accent" />
              )}
              <p className="text-sm text-text-secondary font-mono">
                {state.user?.subscription_tier === 'basic' ? 'Basic Plan' : 'Pro Plan'}
              </p>
            </div>
            {state.user?.subscription_tier === 'basic' && (
              <p className="text-xs text-accent font-mono">
                {state.user.llm_uses_today}/3 AI interactions today
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text font-mono">This Month</h3>
                <p className="text-xs text-text-secondary font-mono">Total Expenses</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-text font-mono">
              {formatCurrency(dashboardData.thisMonthTotal)}
            </p>
            <div className="flex items-center space-x-2">
              {dashboardData.monthlyChange > 0 ? (
                <TrendingUp size={16} className="text-error" />
              ) : (
                <TrendingDown size={16} className="text-primary" />
              )}
              <span className={`text-sm font-mono ${
                dashboardData.monthlyChange > 0 ? 'text-error' : 'text-primary'
              }`}>
                {Math.abs(dashboardData.monthlyChange).toFixed(1)}% vs last month
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-text font-mono">This Week</h3>
                <p className="text-xs text-text-secondary font-mono">Total Expenses</p>
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-text font-mono">
            {formatCurrency(dashboardData.thisWeekTotal)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text font-mono">Total Records</h3>
                <p className="text-xs text-text-secondary font-mono">All Time</p>
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-text font-mono">
            {dashboardData.totalTransactions}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text font-mono">Recent Transactions</h2>
          <Link 
            to="/transactions"
            className="flex items-center space-x-1 text-primary hover:text-primary/80 text-sm font-mono"
          >
            <span>View All</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {dashboardData.recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {dashboardData.recentTransactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-surface-light rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text font-mono">
                    {transaction.item_service}
                  </p>
                  <p className="text-sm text-text-secondary font-mono">
                    {format(new Date(transaction.expense_date), 'MMM dd, yyyy')}
                    {transaction.category && (
                      <span className="ml-2 text-accent">• {transaction.category.name}</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text font-mono">
                    -{formatCurrencyWithSymbol(transaction.amount, transaction.currency_code)}
                  </p>
                  {transaction.currency_code !== state.defaultCurrency && transaction.converted_amount && (
                    <div className="text-xs text-text-muted font-mono">
                      <p>≈ -{formatCurrency(transaction.converted_amount)}</p>
                      {transaction.manual_conversion && (
                        <span className="text-accent">Manual</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-text-secondary font-mono">No transactions yet</p>
            <Link to="/add-expense" className="btn-primary mt-4 inline-flex">
              Add Your First Expense
            </Link>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {state.isAuthenticated && state.user?.subscription_tier === 'basic' && (
        <div className="card border-accent/20 bg-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown size={24} className="text-accent" />
              <div>
                <h3 className="font-semibold text-text font-mono">
                  Upgrade to Pro
                </h3>
                <p className="text-text-secondary font-mono text-sm">
                  Unlock unlimited AI interactions and advanced features for just $1/month
                </p>
              </div>
            </div>
            <Link to="/upgrade" className="btn-accent">
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* Sign Up CTA */}
      {!state.isAuthenticated && (
        <div className="card border-accent/20 bg-accent/5">
          <div className="text-center">
            <h3 className="font-semibold text-text font-mono mb-2">
              Unlock AI-Powered Features
            </h3>
            <p className="text-text-secondary font-mono text-sm mb-4">
              Sign up to sync your data across devices and use our AI assistant for natural language expense tracking.
            </p>
            <Link to="/auth" className="btn-accent">
              Sign Up Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}