import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../config/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import Logger from '../../utils/logger';

const WaterIntakeCard = () => {
  const [waterAmount, setWaterAmount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const waveAnimation = React.useRef(new Animated.Value(0)).current;
  const fillAnimation = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadWaterData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const lastUpdateDate = data.lastWaterUpdate?.toDate();
          const today = new Date();
          
          // Verifica se é um novo dia
          if (!lastUpdateDate || !isSameDay(lastUpdateDate, today)) {
            // Reseta o contador para o novo dia
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              waterAmount: 0,
              lastWaterUpdate: new Date()
            });
            setWaterAmount(0);
          } else {
            // Mantém o valor do dia atual
            setWaterAmount(data.waterAmount || 0);
          }

          Animated.timing(fillAnimation, {
            toValue: (data.waterAmount || 0) / 3000,
            duration: 1000,
            useNativeDriver: false,
          }).start();
        }
      } catch (error) {
        Logger.error('Erro ao carregar dados de consumo de água', error, {
          component: 'WaterIntakeCard',
          action: 'loadWaterData'
        });
      }
    };

    loadWaterData();
  }, []);

  useEffect(() => {
    // Animate wave continuously
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate fill level when water amount changes
    Animated.timing(fillAnimation, {
      toValue: waterAmount / 3000, // Assuming 3000ml is the daily goal
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [waterAmount]);

  const handleAddWater = async () => {
    if (inputValue) {
      const newAmount = waterAmount + parseInt(inputValue);
      setWaterAmount(newAmount);
      setInputValue('');
      setShowInput(false);

      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          waterAmount: newAmount,
          lastWaterUpdate: new Date() // Atualiza a data do último registro
        });
      } catch (error) {
        Logger.error('Erro ao salvar dados de água', error, {
          component: 'WaterIntakeCard',
          action: 'saveWaterData',
          amount: newAmount
        });
      }
    }
  };

  const handleCancel = () => {
    setInputValue('');
    setShowInput(false);
  };

  const handleReset = async () => {
    Alert.alert(
      'Resetar Água',
      'Tem certeza que deseja zerar o contador de água?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                waterAmount: 0,
                lastWaterUpdate: new Date()
              });
              setWaterAmount(0);
              
              // Reseta a animação
              Animated.timing(fillAnimation, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: false,
              }).start();
            } catch (error) {
              Logger.error('Erro ao resetar dados de água', error, {
                component: 'WaterIntakeCard',
                action: 'resetWaterData'
              });
              Alert.alert('Erro', 'Não foi possível resetar o contador de água');
            }
          }
        }
      ]
    );
  };

  const waveTransform = waveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const fillHeight = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const formatWaterAmount = (amount) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}L`;
    }
    return `${amount}ml`;
  };

  // Função auxiliar para verificar se duas datas são do mesmo dia
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E0F7FA', '#B2EBF2']}
        style={styles.card}
      >
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Água Ingerida Hoje</Text>
            <TouchableOpacity 
              onPress={handleReset}
              style={styles.resetButton}
            >
              <MaterialIcons name="refresh" size={24} color="#0277BD" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.glassContainer}>
            <View style={styles.glass}>
              <Animated.View
                style={[
                  styles.waterFill,
                  {
                    height: fillHeight,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.wave,
                    {
                      transform: [{ translateX: waveTransform }],
                    },
                  ]}
                />
              </Animated.View>
            </View>
          </View>

          <Text style={styles.amount}>{formatWaterAmount(waterAmount)}</Text>
          
          {showInput ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Quantidade em ml"
                placeholderTextColor="#90A4AE"
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.addButton]}
                  onPress={handleAddWater}
                >
                  <Text style={styles.buttonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={() => setShowInput(true)}
            >
              <Text style={styles.buttonText}>+ Adicionar Água</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    width: '100%',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0277BD',
  },
  glassContainer: {
    height: 200,
    width: 100,
    marginVertical: 20,
  },
  glass: {
    height: '100%',
    width: '100%',
    borderWidth: 4,
    borderColor: '#0277BD',
    borderRadius: 20,
    overflow: 'hidden',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4FC3F7',
    borderRadius: 16,
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    width: 200,
    backgroundColor: '#81D4FA',
    opacity: 0.5,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0277BD',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    color: '#0277BD',
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#0277BD',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#0277BD',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#0277BD',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#B2EBF2',
  },
});

export default WaterIntakeCard;