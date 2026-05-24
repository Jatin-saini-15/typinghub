import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  hasPaid?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const storedUser = localStorage.getItem('user');
      const role = storedUser ? JSON.parse(storedUser).role : null;
      const isAdmin = role === 'super_admin' || role === 'sub_admin';
      const endpoint = isAdmin ? '/admin/auth/refresh-token' : '/auth/refresh-token';
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success && response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        return response.data.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }, []); // stable — reads role from localStorage, no state dependency

  const logout = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const role = storedUser ? JSON.parse(storedUser).role : null;
      const isAdmin = role === 'super_admin' || role === 'sub_admin';
      const endpoint = isAdmin ? '/admin/auth/logout' : '/auth/logout';
      
      await axios.post(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        {},
        {
          withCredentials: true,
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      if (isMountedRef.current) {
        setIsAuthenticated(false);
        setUser(null);
      }
    }
  }, []); // stable — reads role from localStorage, no state dependency

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const isAdmin = parsedUser.role === 'super_admin' || parsedUser.role === 'sub_admin';
          const endpoint = isAdmin ? '/admin/auth/check-auth' : '/auth/check-auth';
          
          // Verify token with backend
          const response = await axios.get(
            `${API_CONFIG.BASE_URL}${endpoint}`,
            {
              headers: { 'Authorization': `Bearer ${token}` },
              withCredentials: true
            }
          );

          if (response.data.success) {
            if (isMountedRef.current) {
              setIsAuthenticated(true);
              setUser(parsedUser);
            }
          } else {
            // Token might be expired, try to refresh
            const newToken = await refreshToken();
            if (newToken) {
              if (isMountedRef.current) {
                setIsAuthenticated(true);
                setUser(parsedUser);
              }
            } else {
              // If refresh fails, logout
              await logout();
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await logout();
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
  }, []); // Run only on mount — logout/refreshToken are stable (no state deps)

  const login = (token: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin: user?.role === 'super_admin' || user?.role === 'sub_admin',
        user,
        isLoading,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 