import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Routes from './src/routes';
import { StatusBar, Platform, SafeAreaView, View, ActivityIndicator } from 'react-native';
import { auth } from './src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from './src/contexts/auth';
import Logger from './src/utils/logger';

// Componente de Loading
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#1a1a1a" />
  </View>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Limpar logs antigos na inicialização
    Logger.clearOldLogs();
    
    // Log de inicialização do app
    Logger.info('Aplicativo iniciado', {
      version: '1.0.0',
      environment: __DEV__ ? 'development' : 'production'
    });
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: '#1a1a1a',
      paddingTop: Platform.OS === 'ios' ? 50 : 0
    }}>
      <StatusBar 
        style="light"
        backgroundColor='#1a1a1a'
      />
      <AuthProvider>
        <NavigationContainer>
          <Routes user={user} />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaView>
  );
}
