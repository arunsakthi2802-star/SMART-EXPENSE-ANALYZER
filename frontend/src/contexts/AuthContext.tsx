import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, profilePicture?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password, role });
      // Automate login directly after registration
      await login(email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (name: string, profilePicture?: string) => {
    const response = await api.put('/auth/profile', { name, profile_picture: profilePicture });
    setUser(response.data);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
