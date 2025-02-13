import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  ScrollView,
  Platform,
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, orderBy, getDocs, where, deleteDoc } from 'firebase/firestore';
import Logger from '../../utils/logger';

const WeightTracker = () => {
  const [currentWeight, setCurrentWeight] = useState(0);
  const [weightHistory, setWeightHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  useEffect(() => {
    loadWeightHistory();
  }, []);

  const loadWeightHistory = async () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'weights'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const weights = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.split('T')[0]
      }));
      
      setWeightHistory(weights);
      if (weights.length > 0) {
        setCurrentWeight(weights[0].weight);
      }
    } catch (error) {
      Logger.error('Erro ao carregar histórico de peso', error, {
        component: 'WeightTracker',
        action: 'loadWeightHistory'
      });
    }
  };

  const handleWeightSubmit = async () => {
    if (newWeight && !isNaN(newWeight) && auth.currentUser) {
      const weightNum = parseFloat(newWeight);
      
      if (weightNum < 10 || weightNum > 399) {
        Alert.alert(
          'Peso Inválido',
          'Por favor, insira um peso entre 10kg e 400kg.'
        );
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      try {
        await addDoc(collection(db, 'weights'), {
          date: today,
          weight: weightNum,
          userId: auth.currentUser.uid
        });
        
        // Atualiza o histórico local imediatamente
        setWeightHistory(prevHistory => [{
          date: today,
          weight: weightNum,
          userId: auth.currentUser.uid
        }, ...prevHistory]);
        
        setNewWeight('');
        setIsEditing(false);
      } catch (error) {
        Logger.error('Erro ao salvar peso', error, {
          component: 'WeightTracker',
          action: 'saveWeight',
          weight: newWeight
        });
        Alert.alert('Erro', 'Não foi possível salvar o peso');
      }
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Confirmar Reset',
      'Tem certeza que deseja limpar todo o histórico de peso? Esta ação não poderá ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              // Buscar todos os registros do usuário
              const q = query(
                collection(db, 'weights'),
                where('userId', '==', auth.currentUser.uid)
              );
              const querySnapshot = await getDocs(q);
              
              // Deletar cada documento
              const deletePromises = querySnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
              );
              await Promise.all(deletePromises);

              // Limpar todos os estados
              setWeightHistory([]);
              setCurrentWeight(0);
              setNewWeight('');
              setIsEditing(false);
              
              Alert.alert('Sucesso', 'Histórico de peso resetado com sucesso!');
            } catch (error) {
              Logger.error('Erro ao resetar histórico de peso', error, {
                component: 'WeightTracker',
                action: 'resetWeightHistory'
              });
              Alert.alert('Erro', 'Não foi possível resetar o histórico.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const getWeightDifference = () => {
    if (weightHistory.length < 2) return 0;
    
    // Pega os dois registros mais recentes
    const latest = parseFloat(weightHistory[0].weight);
    const previous = parseFloat(weightHistory[1].weight);
    
    // Retorna a diferença (positiva se aumentou, negativa se diminuiu)
    return (latest - previous).toFixed(1);
  };

  const weightDiff = getWeightDifference();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="fitness-center" size={20} color="#333" />
            <Text style={styles.title}>Acompanhamento de Peso</Text>
          </View>
          <View style={styles.headerButtons}>
            {weightHistory.length > 0 && (
              <>
                <TouchableOpacity 
                  style={styles.resetButtonHeader}
                  onPress={handleReset}
                >
                  <MaterialIcons name="refresh" size={20} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.registerButton}
                  onPress={() => setIsEditing(!isEditing)}
                >
                  <Text style={styles.registerButtonText}>
                    {isEditing ? 'Cancelar' : 'Registrar Peso'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {weightHistory.length > 0 ? (
          <>
            {/* Current Weight Display */}
            <View style={styles.weightDisplay}>
              <Text style={styles.currentWeight}>
                {weightHistory[0]?.weight.toFixed(1)} kg
              </Text>
              {weightHistory.length >= 2 && weightDiff !== '0.0' && (
                <View style={styles.weightDiffContainer}>
                  <MaterialIcons 
                    name={parseFloat(weightDiff) > 0 ? 'trending-up' : 'trending-down'} 
                    size={20} 
                    color={parseFloat(weightDiff) > 0 ? '#ef4444' : '#22c55e'} 
                  />
                  <Text style={[
                    styles.weightDiffText,
                    { color: parseFloat(weightDiff) > 0 ? '#ef4444' : '#22c55e' }
                  ]}>
                    {Math.abs(parseFloat(weightDiff))} kg
                  </Text>
                </View>
              )}
            </View>

            {/* Weight Input Form */}
            {isEditing && (
              <View style={styles.formContainer}>
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder="Digite seu peso"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleWeightSubmit}
                  >
                    <Text style={styles.submitButtonText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Weight History */}
            <View style={styles.historyContainer}>
              <View style={styles.historyHeader}>
                <MaterialIcons name="history" size={16} color="#666" />
                <Text style={styles.historyTitle}>Histórico Recente</Text>
              </View>
              
              {weightHistory.slice(-3).reverse().map((entry, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text style={styles.historyWeight}>{entry.weight.toFixed(1)} kg</Text>
                </View>
              ))}
            </View>

            {/* Weekly Average */}
            <View style={styles.averageContainer}>
              <Text style={styles.averageText}>
                Média dos últimos 7 dias:{' '}
                {(weightHistory.slice(-7).reduce((acc, curr) => acc + curr.weight, 0) / 
                  Math.min(weightHistory.length, 7)).toFixed(1)}{' '}
                kg
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>Começe a monitorar seu peso!</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.emptyStateButtonText}>Registrar Peso</Text>
              </TouchableOpacity>
            </View>

            {/* Adicionar o formulário quando isEditing for true */}
            {isEditing && (
              <View style={styles.formContainer}>
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder="Digite seu peso"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleWeightSubmit}
                  >
                    <Text style={styles.submitButtonText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    maxWidth: '95%',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: '40%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  content: {
    maxHeight: 400,
  },
  resetButtonHeader: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  registerButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    maxWidth: 120,
  },
  registerButtonText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  currentWeight: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  weightDiffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weightDiffText: {
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  historyContainer: {
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 14,
    color: '#666',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyWeight: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  averageContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  averageText: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    gap: 8,
    marginBottom: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WeightTracker;