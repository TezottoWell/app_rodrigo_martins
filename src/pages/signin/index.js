import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import * as Animatable from 'react-native-animatable';
import {  useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { auth } from '../../config/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function SignIn() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('fingerprint');

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometricType(hasFaceId ? 'faceid' : 'fingerprint');
      
      setIsBiometricSupported(compatible && enrolled);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedCredentials = await SecureStore.getItemAsync('userCredentials');
        const biometricEnabled = await SecureStore.getItemAsync('biometricEnabled');
        
        if (savedCredentials && biometricEnabled === 'true') {
          const { savedEmail, savedPassword } = JSON.parse(savedCredentials);
          setEmail(savedEmail);
          setPassword(savedPassword);
          setIsBiometricEnabled(true);
          
          handleBiometricAuth();
        } else {
          setIsBiometricEnabled(biometricEnabled === 'true');
        }
      } catch (error) {
        Alert.alert('Erro', 'Erro ao recuperar credenciais');
      }
    })();
  }, []);

  async function saveCredentials() {
    try {
      const credentials = JSON.stringify({
        savedEmail: email,
        savedPassword: password
      });
      await SecureStore.setItemAsync('userCredentials', credentials);
      await SecureStore.setItemAsync('biometricEnabled', 'true');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar credenciais');
    }
  }

  async function removeCredentials() {
    try {
      await SecureStore.deleteItemAsync('userCredentials');
      await SecureStore.setItemAsync('biometricEnabled', 'false');
    } catch (error) {
      // removido console.log
    }
  }

  async function handleBiometricAuth() {
    try {
      if (!email || !password) {
        return;
      }

      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: biometricType === 'faceid' ? 'Login com Face ID' : 'Login com Biometria',
        fallbackLabel: 'Entre com sua senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        requireAuthentication: true
      });

      if (biometricAuth.success) {
        await handleLogin(true);
      }
    } catch (error) {
      // removido console.log
      Alert.alert('Erro', 'Falha na autenticação biométrica');
    }
  }

  function handleSignUp() {
    navigation.replace('SignUp');
  }

  async function handleLogin(isBiometric = false) {
    if (email === '' || password === '') {
      Alert.alert('Atenção', 'Preencha todos os campos!');
      return;
    }

    setLoading(true);

    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      
      if (!isBiometric && isBiometricEnabled) {
        await saveCredentials();
      }

      const userDoc = await getDoc(doc(db, 'users', response.user.uid));
      const userData = userDoc.data();

      if (userData?.isAdmin) {
        navigation.replace('Admin');
      } else {
        navigation.replace('MainApp');
      }
    } catch (error) {
      // removido console.log
      if (error.code === 'auth/invalid-email') {
        Alert.alert('Erro', 'Email incorreto!');
      } else if (error.code === 'auth/invalid-credential') {
        Alert.alert('Erro', 'Senha incorreta / Usuário não cadastrado');
      } else {
        Alert.alert('Erro', 'Erro ao fazer login!');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (email === '') {
      Alert.alert('Atenção', 'Digite seu email para recuperar a senha!');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Sucesso', 'Um email de recuperação foi enviado para sua caixa de entrada!');
    } catch (error) {
      // removido console.log
      if (error.code === 'auth/invalid-email') {
        Alert.alert('Erro', 'Email inválido!');
      } else if (error.code === 'auth/user-not-found') {
        Alert.alert('Erro', 'Usuário não encontrado!');
      } else {
        Alert.alert('Erro', 'Erro ao enviar email de recuperação!');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInLeft" style={styles.message}>
        <Text style={styles.messageText}>Seja bem-vindo(a)</Text>
      </Animatable.View>
      <Animatable.View animation="fadeInUp" style={styles.containerForm}>
        <Text style={styles.formText}>Email</Text>
        <TextInput 
          placeholder='Digite seu email...' 
          style={styles.formInput} 
          placeholderTextColor="#000"
          value={email}
          onChangeText={(text) => setEmail(text)}
        />
        <Text style={styles.formText}>Senha</Text>
        <View style={styles.passwordContainer}>
          <TextInput 
            placeholder='Digite sua senha...' 
            style={styles.passwordInput} 
            placeholderTextColor="#000" 
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => setPassword(text)}
          />
          <TouchableOpacity 
            style={styles.iconEye}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
              size={24} 
              color="#1a1a1a" 
            />
          </TouchableOpacity>
        </View>
        {isBiometricSupported && (
          <View style={styles.biometricContainer}>
            <Text style={styles.biometricText}>Login com biometria</Text>
            <View style={styles.biometricControls}>
              <Switch
                value={isBiometricEnabled}
                onValueChange={async (value) => {
                  setIsBiometricEnabled(value);
                  if (value) {
                    // Verificar credenciais antes de habilitar
                    if (email && password) {
                      await saveCredentials();
                      Alert.alert('Sucesso', 'Login biométrico habilitado!');
                    } else {
                      Alert.alert('Atenção', 'Faça login primeiro para habilitar a biometria');
                      setIsBiometricEnabled(false);
                    }
                  } else {
                    await removeCredentials();
                    Alert.alert('Aviso', 'Login biométrico desabilitado');
                  }
                }}
              />
              {isBiometricEnabled && (
                <TouchableOpacity 
                  style={styles.biometricButton}
                  onPress={handleBiometricAuth}
                >
                  {biometricType === 'faceid' ? (
                    <MaterialCommunityIcons 
                      name="face-recognition" 
                      size={24} 
                      color="#1a1a1a" 
                    />
                  ) : (
                    <Ionicons 
                      name="finger-print" 
                      size={24} 
                      color="#1a1a1a" 
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Carregando...' : 'Entrar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonRegister} onPress={handleSignUp}>
          <Text style={styles.registerText}>Não possui uma conta? Cadastre-se</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonForgotPassword} onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    message: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageText: {
        fontSize: 24,
        color: '#FFF',
    },
    containerForm: {
        flex: 2,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingStart: '5%',
        paddingEnd: '5%',
        paddingTop: '7%',
    },
    formText: {
        fontSize: 20,
        marginTop: 32,
    },
    formInput: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        height: 40,
        fontSize: 16,
        color: '#1a1a1a',
    },
    button: {
        backgroundColor: '#1c1c1c',
        width: '100%',
        paddingVertical: 8,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    buttonText: {
        fontSize: 18,
        color: '#FFF', 
    },
    buttonRegister: {
        marginTop: 32,
    },
    registerText: {
        fontSize: 16,
        color: '#a1a1a1',
        textAlign: 'center',
    },
    buttonForgotPassword: {
        marginTop: 16,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#1c1c1c',
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        marginBottom: 12,
    },
    passwordInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: '#1a1a1a',
    },
    iconEye: {
        padding: 4,
    },
    biometricContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingVertical: 8,
    },
    biometricText: {
        fontSize: 16,
        color: '#1a1a1a',
    },
    biometricControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    biometricButton: {
        padding: 8,
    },
});