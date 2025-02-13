import React, { createContext, useState, useContext } from 'react';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import Logger from '../utils/logger';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signIn(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      setUser(user);
      return user;
    } catch (error) {
      Logger.error('Erro no login', error, {
        component: 'AuthContext',
        action: 'signIn',
        email: email
      });
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      Logger.error('Erro no logout', error, {
        component: 'AuthContext',
        action: 'logout'
      });
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        signIn,
        logout,
        loading,
        setLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export default AuthProvider; 