import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase, type User, type Currency, type Category, type Expense } from '../lib/supabase';

type AppState = {
  user: User | null;
  isAuthenticated: boolean;
  currencies: Currency[];
  categories: Category[];
  expenses: Expense[];
  isLoading: boolean;
  hasSelectedCurrency: boolean;
  defaultCurrency: string | null;
};

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENCIES'; payload: Currency[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DEFAULT_CURRENCY'; payload: string }
  | { type: 'SET_HAS_SELECTED_CURRENCY'; payload: boolean };

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

// Sample expenses with realistic data matching categories and preserved conversion data
const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 1,
    user_id: 'local',
    category_id: 1,
    item_service: 'Lunch at McDonald\'s',
    amount: 45000,
    currency_code: 'IDR',
    expense_date: '2025-01-15',
    note: 'Big Mac combo meal',
    created_at: '2025-01-15T12:30:00Z',
    category: DEFAULT_CATEGORIES[0],
    converted_amount: 3.00, // Preserved conversion at time of creation
    conversion_rate: 0.000067,
    conversion_date: '2025-01-15T12:30:00Z'
  },
  {
    id: 2,
    user_id: 'local',
    category_id: 2,
    item_service: 'Grab ride to office',
    amount: 25000,
    currency_code: 'IDR',
    expense_date: '2025-01-15',
    created_at: '2025-01-15T08:15:00Z',
    category: DEFAULT_CATEGORIES[1],
    converted_amount: 1.67,
    conversion_rate: 0.000067,
    conversion_date: '2025-01-15T08:15:00Z'
  },
  {
    id: 3,
    user_id: 'local',
    category_id: 1,
    item_service: 'Coffee at Starbucks',
    amount: 5.50,
    currency_code: 'USD',
    expense_date: '2025-01-14',
    note: 'Grande Americano',
    created_at: '2025-01-14T16:45:00Z',
    category: DEFAULT_CATEGORIES[0]
    // No conversion needed as it's already in USD
  },
  {
    id: 4,
    user_id: 'local',
    category_id: 3,
    item_service: 'New shirt from Uniqlo',
    amount: 299000,
    currency_code: 'IDR',
    expense_date: '2025-01-14',
    created_at: '2025-01-14T14:20:00Z',
    category: DEFAULT_CATEGORIES[2],
    converted_amount: 19.93,
    conversion_rate: 0.000067,
    conversion_date: '2025-01-14T14:20:00Z'
  },
  {
    id: 5,
    user_id: 'local',
    category_id: 5,
    item_service: 'Electricity bill',
    amount: 450000,
    currency_code: 'IDR',
    expense_date: '2025-01-13',
    note: 'Monthly electricity payment',
    created_at: '2025-01-13T10:00:00Z',
    category: DEFAULT_CATEGORIES[4],
    converted_amount: 30.00,
    conversion_rate: 0.000067,
    conversion_date: '2025-01-13T10:00:00Z'
  },
  {
    id: 6,
    user_id: 'local',
    category_id: 4,
    item_service: 'Movie tickets',
    amount: 12.50,
    currency_code: 'USD',
    expense_date: '2025-01-13',
    note: 'Avatar 3 - 2 tickets',
    created_at: '2025-01-13T19:30:00Z',
    category: DEFAULT_CATEGORIES[3]
    // No conversion needed as it's already in USD
  },
  {
    id: 7,
    user_id: 'local',
    category_id: 2,
    item_service: 'Gas station fill-up',
    amount: 350000,
    currency_code: 'IDR',
    expense_date: '2025-01-12',
    created_at: '2025-01-12T17:15:00Z',
    category: DEFAULT_CATEGORIES[1],
    converted_amount: 23.33,
    conversion_rate: 0.000067,
    conversion_date: '2025-01-12T17:15:00Z'
  },
  {
    id: 8,
    user_id: 'local',
    category_id: 1,
    item_service: 'Grocery shopping at Carrefour',
    amount: 275000,
    currency_code: 'IDR',
    expense_date: '2025-01-12',
    note: 'Weekly groceries',
    created_at: '2025-01-12T11:45:00Z',
    category: DEFAULT_CATEGORIES[0],
    converted_amount: 18.33,
    conversion_rate: 0.000067,
    conversion_date: '2025-01-12T11:45:00Z'
  },
  {
    id: 9,
    user_id: 'local',
    category_id: 6,
    item_service: 'Doctor consultation',
    amount: 200000,
    currency_code: 'IDR',
    expense_date: '2025-01-11',
    note: 'General checkup',
    created_at: '2025-01-11T15:30:00Z',
    category: DEFAULT_CATEGORIES[5],
    converted_amount: 13.33,
    conversion_rate: 0.000067,
    conversion_date: '2025-01-11T15:30:00Z'
  },
  {
    id: 10,
    user_id: 'local',
    category_id: 8,
    item_service: 'Online course subscription',
    amount: 29.99,
    currency_code: 'USD',
    expense_date: '2025-01-10',
    note: 'Udemy React course',
    created_at: '2025-01-10T09:00:00Z',
    category: DEFAULT_CATEGORIES[7]
    // No conversion needed as it's already in USD
  }
];

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  currencies: [],
  categories: DEFAULT_CATEGORIES,
  expenses: SAMPLE_EXPENSES,
  isLoading: true,
  hasSelectedCurrency: false,
  defaultCurrency: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    case 'SET_CURRENCIES':
      return {
        ...state,
        currencies: action.payload,
      };
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
      };
    case 'SET_EXPENSES':
      return {
        ...state,
        expenses: action.payload,
      };
    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [action.payload, ...state.expenses],
      };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(exp => 
          exp.id === action.payload.id ? action.payload : exp
        ),
      };
    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter(exp => exp.id !== action.payload),
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_DEFAULT_CURRENCY':
      return {
        ...state,
        defaultCurrency: action.payload,
      };
    case 'SET_HAS_SELECTED_CURRENCY':
      return {
        ...state,
        hasSelectedCurrency: action.payload,
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // Check if user has selected a default currency
    const hasSelected = localStorage.getItem('hasSelectedCurrency');
    const defaultCurrency = localStorage.getItem('defaultCurrency');
    
    if (hasSelected && defaultCurrency) {
      dispatch({ type: 'SET_HAS_SELECTED_CURRENCY', payload: true });
      dispatch({ type: 'SET_DEFAULT_CURRENCY', payload: defaultCurrency });
    }

    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile
        fetchUserProfile(session.user.id);
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle cases where no row exists

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        dispatch({ type: 'SET_USER', payload: data });
      } else {
        // User profile doesn't exist, create it
        console.log('User profile not found, creating new profile...');
        const { data: authUser } = await supabase.auth.getUser();
        
        if (authUser.user) {
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.user.id,
              email: authUser.user.email,
              default_currency_code: 'USD',
              subscription_tier: 'basic',
              llm_uses_today: 0,
              last_llm_reset_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating user profile:', createError);
          } else if (newProfile) {
            dispatch({ type: 'SET_USER', payload: newProfile });
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}