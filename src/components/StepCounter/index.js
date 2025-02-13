import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform, PermissionsAndroid } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const StepCard = React.memo(({ title, value, icon, subtitle }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <FontAwesome5 name={icon} size={20} color="#4A5568" />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <Text style={styles.cardValue}>{value}</Text>
    {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
  </View>
));

export default function StepCounter() {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [pastStepCount, setPastStepCount] = useState(0);
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [error, setError] = useState(null);

  const checkPedometerPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: "Permissão de Atividade Física",
            message: "Precisamos acessar suas informações de atividade física",
            buttonNeutral: "Pergunte-me depois",
            buttonNegative: "Cancelar",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        setError(err.message);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    let subscription;
    
    const subscribe = async () => {
      try {
        const hasPermission = await checkPedometerPermission();
        if (!hasPermission) {
          setIsPedometerAvailable('false');
          setError('Permissão de atividade física não concedida');
          return;
        }

        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(String(isAvailable));

        if (isAvailable) {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 1);

          const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
          if (pastStepCountResult) {
            setPastStepCount(pastStepCountResult.steps);
          }

          subscription = Pedometer.watchStepCount(result => {
            setCurrentStepCount(result.steps);
          });
        }
      } catch (err) {
        setIsPedometerAvailable('false');
        setError(err.message);
      }
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const totalSteps = pastStepCount + currentStepCount;
  const caloriesBurned = Math.round(totalSteps * 0.04);
  const progress = Math.min((totalSteps / 10000) * 100, 100);

  if (isPedometerAvailable === 'checking') {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Verificando sensor...</Text>
      </View>
    );
  }

  if (isPedometerAvailable === 'false') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {error || 'Pedômetro não disponível neste dispositivo'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="walking" size={24} color="#2D3748" />
        <Text style={styles.headerText}>Contador de Passos</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>{totalSteps.toLocaleString()}</Text>
          <Text style={styles.progressLabel}>passos hoje</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.goalText}>Meta: 10.000 passos</Text>
      </View>

      <View style={styles.cardsContainer}>
        <StepCard 
          title="Últimas 24h" 
          value={pastStepCount.toLocaleString()}
          icon="history"
        />
        <StepCard 
          title="Calorias" 
          value={caloriesBurned}
          icon="fire"
          subtitle="kcal queimadas"
        />
      </View>

      <View style={styles.currentContainer}>
        <FontAwesome5 name="shoe-prints" size={16} color="#4A5568" />
        <Text style={styles.currentText}>
          Passos atuais: {currentStepCount}
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#2D3748',
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  progressText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  progressLabel: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4299E1',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    width: (width - 50) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#4A5568',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  currentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentText: {
    fontSize: 16,
    color: '#4A5568',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
  },
  devWarning: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  devWarningText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
  },
});