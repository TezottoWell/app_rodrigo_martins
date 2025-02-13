import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Vibration,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const WorkoutTimerCard = () => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const formatTime = () => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (!isActive) {
      setIsActive(true);
      setIsPaused(false);
      Vibration.vibrate(100);
    } else {
      setIsPaused(!isPaused);
      Vibration.vibrate(100);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);
    Vibration.vibrate([100, 100, 100]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        style={styles.card}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Cronômetro de Treino</Text>
          
          <Animatable.View 
            animation="fadeIn" 
            style={styles.timerContainer}
            iterationCount={1}
          >
            <View style={styles.digitalDisplay}>
              <Text style={styles.timerText}>{formatTime()}</Text>
              {isActive && !isPaused && (
                <Animatable.View
                  animation="flash"
                  iterationCount="infinite"
                  duration={1000}
                  style={styles.activeIndicator}
                />
              )}
            </View>
          </Animatable.View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
            >
              <MaterialCommunityIcons 
                name="restart" 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button, 
                styles.startButton,
                isPaused && styles.pausedButton
              ]}
              onPress={handleStartStop}
            >
              <MaterialCommunityIcons 
                name={!isActive || isPaused ? "play" : "pause"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    opacity: 0.9,
  },
  timerContainer: {
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#000',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#333',
  },
  digitalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 48,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#00ff00',
    letterSpacing: 2,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#00ff00',
    borderRadius: 4,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButton: {
    backgroundColor: '#28a745',
  },
  pausedButton: {
    backgroundColor: '#ffc107',
  },
  resetButton: {
    backgroundColor: '#dc3545',
  },
});

export default WorkoutTimerCard;