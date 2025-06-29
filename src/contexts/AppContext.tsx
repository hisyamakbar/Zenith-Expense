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

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  currencies: [],
  categories: [],
  expenses: [],
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
        .single();

      if (error) throw error;
      if (data) {
        dispatch({ type: 'SET_USER', payload: data });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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