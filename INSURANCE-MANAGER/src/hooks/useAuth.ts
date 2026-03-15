'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export type UserType = 'hospital' | 'agent' | 'patient' | null;

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  userType: UserType;
  // Type specific fields
  hospital_id?: string;
  hospital_name?: string;
  company_id?: string;
  company_name?: string;
  company_code?: string;
  policy_number?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    userType: 'hospital' | 'agent' | 'patient',
    identifier: string, // email or phone
    password: string,
    companyId?: string,
    hospitalId?: string
  ) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType,
          identifier,
          password,
          companyId,
          hospitalId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      toast.success('Login successful!');
      return { success: true, user: data.user };
    } catch (error: any) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    userType: 'hospital' | 'agent' | 'patient',
    userData: any
  ) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType,
          ...userData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      toast.success('Registration successful!');
      return { success: true, user: data.user };
    } catch (error: any) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    toast.success('Logged out successfully');
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}