import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import Logger from '../../utils/logger';

export default function Financeiro() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.goBack();
      return;
    }

    const loadData = async () => {
      try {
        // Verificar solicitações pendentes
        const solicitacoesRef = collection(db, 'solicitacoes');
        const q = query(
          solicitacoesRef,
          where('userId', '==', auth.currentUser.uid),
          where('status', '==', 'pendente')
        );
        
        const querySnapshot = await getDocs(q);
        setSolicitacaoEnviada(!querySnapshot.empty);

        // Monitorar dados do usuário
        const unsubscribe = onSnapshot(
          doc(db, 'users', auth.currentUser.uid),
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              setUserData(docSnapshot.data());
            }
          },
          (error) => {
            Logger.error('Erro ao carregar dados do usuário', error);
            Alert.alert('Erro', 'Não foi possível carregar seus dados');
          }
        );

        return () => unsubscribe();
      } catch (error) {
        Logger.error('Erro ao carregar dados', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleInfo = () => {
    setShowInfo(!showInfo);
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: showInfo ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: showInfo ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

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
      Logger.error('Erro ao enviar solicitação', error);
      Alert.alert('Erro', 'Não foi possível enviar a solicitação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactPress = () => {
    Linking.openURL('https://api.whatsapp.com/send?phone=5514997121314');
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1000],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financeiro</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Dropdown de Informações */}
        <TouchableOpacity 
          style={styles.infoHeader}
          onPress={toggleInfo}
        >
          <Text style={styles.infoHeaderText}>Informações do Plano</Text>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#1a1a1a" />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View style={[styles.infoContent, { maxHeight }]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Como Funciona</Text>
            <Text style={styles.text}>
              O Team Rodrigo Martins é um aplicativo exclusivo para alunos que possuem consultoria ativa com o Personal Trainer Rodrigo Martins.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recursos Disponíveis</Text>
            <Text style={styles.text}>
              • Treinos personalizados{'\n'}
              • Acompanhamento de peso{'\n'}
              • Controle de hidratação{'\n'}
              • Contador de passos{'\n'}
              • Cronômetro de treino
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações Importantes</Text>
            <Text style={styles.text}>
              • O app não possui compras dentro do aplicativo{'\n'}
              • Todo o conteúdo é desbloqueado ao contratar a consultoria presencial{'\n'}
              • O acesso é automaticamente suspenso ao término da consultoria{'\n'}
              • Para renovar o acesso, basta renovar sua consultoria presencial
            </Text>
          </View>
        </Animated.View>

        {/* Status do Plano */}
        {userData?.planoAtivo ? (
          <View style={styles.planoAtivoContainer}>
            <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.planoAtivoTitle}>Plano Ativo</Text>
            <Text style={styles.planoAtivoText}>
              Seu plano está ativo e você tem acesso a todos os recursos do aplicativo.
            </Text>
          </View>
        ) : (
          <View style={styles.planoInativoContainer}>
            <Text style={styles.description}>
              Para ter acesso a todos os recursos do aplicativo, entre em contato via WhatsApp ou solicite a liberação do app.
            </Text>

            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={handleContactPress}
            >
              <FontAwesome5 name="whatsapp" size={24} color="#FFF" />
              <Text style={styles.buttonText}>Contato via WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.solicitarButton, solicitacaoEnviada && styles.buttonDisabled]}
              onPress={handleSolicitacao}
              disabled={solicitacaoEnviada}
            >
              <Text style={styles.buttonText}>
                {solicitacaoEnviada ? 'Solicitação enviada' : 'Solicitar liberação do app'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  infoHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  infoContent: {
    overflow: 'hidden',
  },
  section: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
  planoAtivoContainer: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  planoAtivoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  planoAtivoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  planoInativoContainer: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  solicitarButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
}); 