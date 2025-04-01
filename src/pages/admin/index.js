import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useEffect, useState } from 'react';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { doc, getDoc, collection, query, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function Admin() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.replace('SignIn');
      return;
    }

    async function loadUserData() {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os dados');
      }
    }

    loadUserData();

    // Adicionar listener para solicitações
    const q = query(collection(db, 'solicitacoes'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const solicitacoesArray = [];
      querySnapshot.forEach((doc) => {
        solicitacoesArray.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setSolicitacoes(solicitacoesArray.filter(s => s.status === 'pendente'));
    });

    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    try {
      await signOut(auth);
      navigation.replace('SignIn');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao sair!');
    }
  }

  function handleVisitHomepage() {
    navigation.replace('MainApp', { screen: 'Home' });
  }

  function handleManageUsers() {
    navigation.navigate('ManageUsers');
  }

  function handleCreateWorkout() {
    navigation.navigate('CreateWorkout');
  }

  function handleEditWorkout() {
    navigation.navigate('EditWorkout');
  }

  function handleTreinoModelo() {
    console.log('Tentando navegar para TreinoModelo');
    navigation.navigate('TreinoModelo');
  }

  const handleSolicitacao = async (solicitacaoId, novoStatus, userId) => {
    try {
      setIsLoading(true);
      
      // Atualiza o status da solicitação
      await updateDoc(doc(db, 'solicitacoes', solicitacaoId), {
        status: novoStatus,
        dataResposta: new Date().toISOString()
      });

      // Atualiza o planoAtivo do usuário baseado no status
      await updateDoc(doc(db, 'users', userId), {
        planoAtivo: novoStatus === 'aprovado'
      });

      Alert.alert('Sucesso', 'Solicitação atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInLeft" style={styles.header}>
        <Text style={styles.headerTitle}>Painel Administrativo</Text>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" style={styles.content}>
        <Text style={styles.welcomeText}>Bem-vindo {userData?.name || 'Administrador'}</Text>
        
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.actionButton} onPress={handleManageUsers}>
              <MaterialIcons name="people" size={28} color="#FFF" />
              <Text style={styles.buttonText}>Gerenciar Usuários</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleCreateWorkout}>
              <FontAwesome5 name="dumbbell" size={28} color="#FFF" />
              <Text style={styles.buttonText}>Lançar Treino</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleEditWorkout}>
              <MaterialIcons name="edit" size={28} color="#FFF" />
              <Text style={styles.buttonText}>Editar Treino</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleTreinoModelo}>
              <MaterialIcons name="library-books" size={28} color="#FFF" />
              <Text style={styles.buttonText}>Treino Modelo</Text>
            </TouchableOpacity>
          </View>
          
          {solicitacoes.length > 0 && (
            <View style={styles.solicitacoesContainer}>
              <Text style={styles.solicitacoesTitle}>Solicitações Pendentes</Text>
              {solicitacoes.map((solicitacao) => (
                <View key={solicitacao.id} style={styles.solicitacaoCard}>
                  <Text style={styles.solicitacaoText}>
                    Usuário: {solicitacao.userName}
                  </Text>
                  <Text style={styles.solicitacaoText}>
                    Email: {solicitacao.userEmail}
                  </Text>
                  <View style={styles.solicitacaoBotoes}>
                    <TouchableOpacity 
                      style={[styles.solicitacaoButton, styles.aprovarButton]}
                      onPress={() => handleSolicitacao(solicitacao.id, 'aprovado', solicitacao.userId)}
                    >
                      <Text style={styles.buttonText}>Aprovar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.solicitacaoButton, styles.rejeitarButton]}
                      onPress={() => handleSolicitacao(solicitacao.id, 'rejeitado', solicitacao.userId)}
                    >
                      <Text style={styles.buttonText}>Rejeitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.navigationButton} onPress={handleVisitHomepage}>
            <MaterialIcons name="home" size={24} color="#FFF" />
            <Text style={styles.navigationButtonText}>Visitar Homepage</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navigationButton} onPress={handleLogout}>
            <MaterialIcons name="exit-to-app" size={24} color="#FFF" />
            <Text style={styles.navigationButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  buttonGroup: {
    gap: 15,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 10,
    gap: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  navigationButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navigationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  solicitacoesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 20,
  },
  solicitacoesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 10,
  },
  solicitacaoCard: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  solicitacaoText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  solicitacaoBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  solicitacaoButton: {
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  aprovarButton: {
    backgroundColor: '#4CAF50',
  },
  rejeitarButton: {
    backgroundColor: '#FF4444',
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