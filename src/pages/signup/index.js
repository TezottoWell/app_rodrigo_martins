import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db, storage } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../utils/logger';

export default function SignUp() {
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordMatch, setPasswordMatch] = useState(0);

  const handleSelectPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Precisamos de permissão para acessar suas fotos!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Logger.error('Erro ao selecionar foto', error, {
        component: 'SignUp',
        action: 'handleSelectPhoto'
      });
      alert('Erro ao selecionar foto');
    }
  };

  const uploadImage = async (uri) => {
    if (!uri) return null;
    try {
      const filename = `profile_${Date.now()}`;
      const storageRef = ref(storage, `profile_images/${filename}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return downloadURL;
    } catch (error) {
      throw error;
    }
  };

  const compressImage = async (uri) => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipulatedImage.uri;
    } catch (error) {
      throw error;
    }
  };

  const checkPasswordStrength = (pass) => {
    setPassword(pass);
    const strength = (pass.length / 6) * 100;
    setPasswordStrength(Math.min(strength, 100));
  };

  const checkPasswordMatch = (confirmPass) => {
    setConfirmPassword(confirmPass);
    const match = password === confirmPass ? 100 : 
      (confirmPass.length / password.length) * 100;
    setPasswordMatch(Math.min(match, 100));
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      let photoBase64 = null;
      if (photoUri) {
        try {
          const compressedUri = await compressImage(photoUri);
          const response = await fetch(compressedUri);
          const blob = await response.blob();
          const reader = new FileReader();
          photoBase64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          Logger.error('Erro ao processar imagem', error, {
            component: 'SignUp',
            action: 'handleSignUp'
          });
          console.error('Erro ao processar imagem:', error);
        }
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        nameLower: name.toLowerCase(),
        email,
        photoURL: photoBase64,
        isAdmin: false,
        planoAtivo: false,
        createdAt: new Date()
      });

      navigation.replace('SignIn');
    } catch (error) {
      Logger.error('Erro no cadastro', error, {
        component: 'SignUp',
        action: 'handleSignUp',
        email: email
      });
      console.error('Erro no cadastro:', error);
      alert('Erro ao criar conta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" delay={500} style={styles.header}>
            <Text style={styles.messageText}>Criar Conta</Text>
            <TouchableOpacity style={styles.photoContainer} onPress={handleSelectPhoto}>
              <Image 
                source={photoUri ? { uri: photoUri } : require('../../../assets/profile-placeholder.png')}
                style={styles.photoImage}
              />
              <View style={styles.photoOverlay}>
                <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={styles.photoText}>Adicionar foto</Text>
            </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={800} style={styles.containerForm}>
            <Text style={styles.formText}>Nome</Text>
            <View style={styles.inputContainer}>
              <TextInput placeholder='Digite seu nome...' style={styles.formInput} value={name} onChangeText={setName} placeholderTextColor="#000"></TextInput>
            </View>
            <Text style={styles.formText}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput placeholder='Digite seu email...' style={styles.formInput} value={email} onChangeText={setEmail} placeholderTextColor="#000"></TextInput>
            </View>
            <Text style={styles.formText}>Senha</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            placeholder='Digite sua senha...' 
            style={styles.formInput} 
            value={password}
            onChangeText={checkPasswordStrength}
            secureTextEntry={!showPassword}
            placeholderTextColor="#000"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconButton}>
            <MaterialCommunityIcons 
              name={showPassword ? "eye-off" : "eye"} 
              size={24} 
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordStrengthContainer}>
          <View style={[styles.passwordStrengthBar, { width: `${passwordStrength}%`, backgroundColor: passwordStrength >= 100 ? '#4CAF50' : '#ff9800' }]} />
        </View>
        <Text style={styles.passwordHint}>
          {password.length < 6 ? `Ainda faltam ${6 - password.length} caracteres` : 'Senha válida!'}
        </Text>

        <Text style={styles.formText}>Confirme sua senha</Text>
        <View style={styles.inputContainer}>
          <TextInput 
            placeholder='Confirme sua senha...' 
            style={styles.formInput} 
            value={confirmPassword}
            onChangeText={checkPasswordMatch}
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor="#000"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.iconButton}>
            <MaterialCommunityIcons 
              name={showConfirmPassword ? "eye-off" : "eye"} 
              size={24} 
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordStrengthContainer}>
          <View style={[
            styles.passwordStrengthBar, 
            { 
              width: `${passwordMatch}%`, 
              backgroundColor: password === confirmPassword ? '#4CAF50' : '#ff9800' 
            }
          ]} />
        </View>
        <Text style={styles.passwordHint}>
          {password !== confirmPassword 
            ? 'As senhas não coincidem' 
            : confirmPassword.length > 0 ? 'Senhas coincidem!' : ''}
        </Text>

        <TouchableOpacity 
          style={[
            styles.button, 
            (loading || password.length < 6 || password !== confirmPassword) && styles.buttonDisabled
          ]} 
          onPress={handleSignUp}
          disabled={loading || password.length < 6 || password !== confirmPassword}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Aguarde...' : 'Registrar'}
          </Text>
        </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
   </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({  
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
  },
  messageText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 25,
    right: -5,
    backgroundColor: '#1a1a1a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
    opacity: 0.8,
  },
  containerForm: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 35,
    paddingBottom: 50,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
  },
  formInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  formText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#1a1a1a',
    padding: 18,
    borderRadius: 12,
    marginTop: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  passwordStrengthContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 10,
  },
  passwordStrengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  passwordHint: {
    color: '#666',
    fontSize: 13,
    marginBottom: 20,
  },
});