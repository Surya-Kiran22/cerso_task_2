import React, { createContext, useState, useEffect } from 'react';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await client.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (err) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    return res.data;
  };

  const verifyLoginOtp = async (email, otp) => {
    const res = await client.post('/auth/verify-login-otp', { email, otp });
    const { token: newToken, user: newUser } = res.data;
    if (newToken) {
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await client.post('/auth/register', { name, email, password });
    return res.data;
  };

  const verifyRegistrationOtp = async (email, otp) => {
    const res = await client.post('/auth/verify-registration-otp', { email, otp });
    const { token: newToken, user: newUser } = res.data;
    if (newToken) {
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
    return res.data;
  };

  const resendOtp = async (email, purpose) => {
    const res = await client.post('/auth/resend-otp', { email, purpose });
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        verifyLoginOtp,
        register,
        verifyRegistrationOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
