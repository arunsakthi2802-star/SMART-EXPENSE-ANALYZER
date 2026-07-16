import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import api from './utils/api';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Budgets } from './pages/Budgets';
import { Analytics } from './pages/Analytics';
import { AIInsights } from './pages/AIInsights';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Developers } from './pages/Developers';
import { TransactionModal } from './components/TransactionModal';
import { BudgetModal } from './components/BudgetModal';
import { Transaction } from './types';

// Route Guard to verify active tokens
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-brand-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Modals management
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // Fetch and cache user settings (like currency code) on startup
  React.useEffect(() => {
    const fetchAndCacheSettings = async () => {
      if (token) {
        try {
          const response = await api.get('/settings');
          if (response.data && response.data.currency) {
            localStorage.setItem('user_currency', response.data.currency);
          }
        } catch (e) {
          console.error('Failed to fetch settings for cache:', e);
        }
      }
    };
    fetchAndCacheSettings();
  }, [token]);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => !prev);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  };

  const handleCloseTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-brand-950 transition-colors duration-300">
        {token ? (
          <div className="flex">
            {/* Nav Sidebar */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            
            {/* Core view content area */}
            <div className="flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen">
              <Navbar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                onAddTransaction={() => setIsTxModalOpen(true)}
              />
              <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                <Routes>
                  <Route path="/" element={<PrivateRoute><Dashboard refreshTrigger={refreshTrigger} /></PrivateRoute>} />
                  <Route
                    path="/transactions"
                    element={
                      <PrivateRoute>
                        <Transactions
                          onOpenAddModal={() => setIsTxModalOpen(true)}
                          onEditTransaction={handleEditTx}
                          refreshTrigger={refreshTrigger}
                          onRefreshCompleted={() => {}}
                        />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/budgets"
                    element={
                      <PrivateRoute>
                        <Budgets
                          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
                          refreshTrigger={refreshTrigger}
                        />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                  <Route path="/ai-insights" element={<PrivateRoute><AIInsights /></PrivateRoute>} />
                  <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
                  <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                  <Route path="/developers" element={<PrivateRoute><Developers /></PrivateRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/developers" element={<Developers />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}

        {/* Global Dialog Modals */}
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={handleCloseTxModal}
          onSuccess={triggerRefresh}
          transactionToEdit={editingTx}
        />
        <BudgetModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          onSuccess={triggerRefresh}
        />
      </div>
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};
