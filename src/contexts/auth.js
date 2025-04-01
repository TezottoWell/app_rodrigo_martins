import React, { createContext, useState, useContext } from 'react';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

  async function deleteAccount(password) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuário não encontrado');

      // Reautenticar o usuário antes de deletar
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Armazenar o ID do usuário para usar depois
      const userId = currentUser.uid;

      // Primeiro deletar a conta de autenticação
      await deleteUser(currentUser);

      // Agora que a conta foi deletada, podemos usar uma referência admin para limpar os dados
      try {
        // Tentar deletar os dados do Firestore
        await deleteDoc(doc(db, 'users', userId));

        // Buscar e deletar treinos
        const treinosSnapshot = await getDocs(query(
          collection(db, 'treinos'),
          where('userId', '==', userId)
        ));
        for (const doc of treinosSnapshot.docs) {
          await deleteDoc(doc.ref);
        }

        // Buscar e deletar registros de peso
        const weightsSnapshot = await getDocs(query(
          collection(db, 'weights'),
          where('userId', '==', userId)
        ));
        for (const doc of weightsSnapshot.docs) {
          await deleteDoc(doc.ref);
        }
      } catch (firestoreError) {
        // Se houver erro ao deletar dados do Firestore, apenas logamos
        // já que a conta de autenticação já foi deletada
        Logger.warn('Erro ao limpar dados do Firestore após deletar conta', {
          component: 'AuthContext',
          action: 'deleteAccount',
          userId: userId,
          error: firestoreError
        });
      }

      setUser(null);

      Logger.info('Conta deletada com sucesso', {
        component: 'AuthContext',
        action: 'deleteAccount',
        userId: userId
      });
    } catch (error) {
      Logger.error('Erro ao deletar conta', error, {
        component: 'AuthContext',
        action: 'deleteAccount'
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
        deleteAccount,
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