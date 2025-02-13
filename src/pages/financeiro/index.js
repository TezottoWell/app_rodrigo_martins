import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { auth, db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, getDocs, addDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

export default function Financeiro() {
  const navigation = useNavigation();
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);

  const startShakeAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    ).start();
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        })
      );
      return;
    }

    let unsubscribeUser;

    const loadData = async () => {
      try {
        // Verificar se já existe uma solicitação pendente
        const solicitacoesRef = collection(db, 'solicitacoes');
        const q = query(
          solicitacoesRef,
          where('userId', '==', auth.currentUser.uid),
          where('status', '==', 'pendente')
        );
        
        const querySnapshot = await getDocs(q);
        setSolicitacaoEnviada(!querySnapshot.empty);

        // Monitorar apenas os dados do usuário
        unsubscribeUser = onSnapshot(
          doc(db, 'users', auth.currentUser.uid),
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              setUserData(docSnapshot.data());
            }
          },
          (error) => {
            Alert.alert('Erro', 'Não foi possível carregar seus dados');
          }
        );

        startShakeAnimation();
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        gestureEnabled: false,
        headerLeft: null,
      });
    }, [])
  );

  const handleSolicitacao = async () => {
    if (solicitacaoEnviada) return;
    
    try {
      setIsLoading(true);
      
      await addDoc(collection(db, 'solicitacoes'), {
        userId: auth.currentUser.uid,
        userName: userData?.name || '',
        userEmail: auth.currentUser.email,
        status: 'pendente',
        dataSolicitacao: new Date().toISOString()
      });

      setSolicitacaoEnviada(true);
      Alert.alert('Sucesso', 'Solicitação enviada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a solicitação');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirWhatsapp = () => {
    Linking.openURL('https://wa.me/5511999999999');
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        })
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível fazer logout');
    }
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  const HeaderComponent = React.memo(() => (
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>Área Financeira</Text>
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  ));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HeaderComponent />
      </View>
      
      <View style={styles.content}>
        {userData?.planoAtivo ? (
          <View style={styles.planoAtivoContainer}>
            <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.planoAtivoTitle}>Plano Ativo</Text>
            <Text style={styles.planoAtivoText}>
              Seu plano está ativo e você tem acesso a todos os recursos do aplicativo.
            </Text>
            <TouchableOpacity 
              style={styles.voltarButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.voltarButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              Para ter acesso a todos os recursos do aplicativo, entre em contato via WhatsApp ou solicite a liberação do app.
            </Text>

            <TouchableOpacity 
              style={styles.whatsappButton} 
              onPress={abrirWhatsapp}
            >
              <FontAwesome5 name="whatsapp" size={24} color="#FFF" />
              <Text style={styles.buttonText}>Contato via WhatsApp</Text>
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.liberacaoButton,
                { transform: [{ translateX: shakeAnimation }] },
                solicitacaoEnviada && styles.buttonDisabled
              ]}
            >
              <TouchableOpacity 
                onPress={handleSolicitacao} 
                disabled={isLoading || solicitacaoEnviada}
                style={styles.liberacaoButtonInner}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Enviando...' : 
                   solicitacaoEnviada ? 'Solicitação enviada' : 
                   'Solicitar liberação do app'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  logoutButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  liberacaoButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginTop: 10,
  },
  liberacaoButtonInner: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planoAtivoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 3,
  },
  planoAtivoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 10,
  },
  planoAtivoText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  voltarButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  voltarButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: '#666',
  },
}); 