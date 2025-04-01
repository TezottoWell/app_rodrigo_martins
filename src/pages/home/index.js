import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, KeyboardAvoidingView, Platform, ActionSheetIOS } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import StepCounterCard from '../../components/StepCounter';
import WaterIntakeCard from '../../components/WaterIntakeCard';
import WorkoutTimerCard from '../../components/WorkoutTimerCard';
import WeightTracker from '../../components/WeightTracker';
import * as ImagePicker from 'expo-image-picker';
import { CommonActions } from '@react-navigation/native';
import Logger from '../../utils/logger';
import { useAuth } from '../../contexts/auth';


export default function Home() {
  const navigation = useNavigation();
  const { deleteAccount } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

    // Usar onSnapshot para ouvir mudanças em tempo real
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserData(docSnapshot.data());
        }
      },
      (error) => {
        Logger.error('Erro ao carregar dados do usuário', error, {
          component: 'Home',
          action: 'loadUserData',
          userId: auth.currentUser.uid
        });
        Alert.alert('Erro', 'Não foi possível carregar seus dados');
      }
    );

    setIsLoading(false);

    return () => unsubscribeUser();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        gestureEnabled: false,
        headerLeft: null,
      });
    }, [])
  );

  const handleLogout = async () => {
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
  };

  const handleProfilePhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Ver foto', 'Alterar foto', 'Remover foto'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        async (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              if (userData?.photoURL) {
                navigation.navigate('ImageViewer', { imageUrl: userData.photoURL });
              }
              break;
            case 2:
              handleSelectPhoto();
              break;
            case 3:
              handleRemovePhoto();
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Foto de Perfil',
        'Escolha uma opção',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver foto', onPress: () => userData?.photoURL && navigation.navigate('ImageViewer', { imageUrl: userData.photoURL }) },
          { text: 'Alterar foto', onPress: handleSelectPhoto },
          { text: 'Remover foto', onPress: handleRemovePhoto, style: 'destructive' },
        ]
      );
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        const base64Size = result.assets[0].base64.length * (3/4) - 2;
        const maxSize = 1024 * 1024;

        if (base64Size > maxSize) {
          Alert.alert('Erro', 'A imagem é muito grande. Por favor, escolha uma imagem menor.');
          return;
        }

        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          photoURL: base64Image
        });
      }
    } catch (error) {
      Logger.error('Erro ao atualizar foto', error, {
        component: 'Home',
        action: 'handleUpdatePhoto'
      });
      Alert.alert('Erro', 'Não foi possível atualizar a foto. Tente novamente.');
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photoURL: null
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover a foto');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão permanentemente removidos.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sim, excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                })
              );
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir sua conta. Tente novamente.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Renderiza tela de bloqueio se o plano não estiver ativo
  if (!userData?.planoAtivo) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.replace('SignIn')}
        >
          <MaterialIcons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.blockedContainer}>
          <MaterialIcons name="lock" size={64} color="#FFF" />
          <Text style={styles.blockedText}>Acesso Bloqueado</Text>
          <Text style={styles.blockedSubText}>
            Seu plano não está ativo. Acesse a área financeira para regularizar.
          </Text>
          <TouchableOpacity 
            style={styles.financeiroBotao}
            onPress={() => navigation.navigate('Financeiro')}
          >
            <Text style={styles.financeiroBotaoTexto}>Ir para Financeiro</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInLeft" style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Home</Text>
          {userData?.isAdmin && (
            <TouchableOpacity 
              onPress={() => navigation.replace('Admin')} 
              style={styles.adminButton}
            >
              <MaterialIcons name="admin-panel-settings" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={handleProfilePhoto}>
            <Image 
              source={
                userData?.photoURL 
                  ? { uri: userData.photoURL }
                  : require('../../../assets/profile-placeholder.png')
              }
              style={styles.userPhoto}
            />
          </TouchableOpacity>
          <View style={styles.userTextContainer}>
            <Text style={styles.userName}>
              {userData?.name || 'Usuário'}
            </Text>
            <Text style={styles.userEmail}>
              {userData?.email || auth.currentUser?.email}
            </Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity onPress={handleLogout} style={styles.actionButton}>
              <MaterialIcons name="logout" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animatable.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 2 }}
      >
        <Animatable.View animation="fadeInUp" style={styles.content}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: 30,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.welcomeText}>
              Bem-vindo, {userData?.name?.split(' ')[0] || 'Usuário'}!
            </Text>
            <StepCounterCard steps={7500} />
            <WaterIntakeCard />
            <WorkoutTimerCard />
            <WeightTracker />
          </ScrollView>
        </Animatable.View>
      </KeyboardAvoidingView>
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
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 2,
    backgroundColor: '#F8F7FF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 30,
  },
  text: {
    fontSize: 20,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  logoutButton: {
    padding: 8,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#DDD',
    marginTop: 2,
  },
  welcomeText: {
    fontSize: 24,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blockedText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  blockedSubText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  financeiroBotao: {
    backgroundColor: '#FF0000',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  financeiroBotaoTexto: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  adminButton: {
    padding: 8,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#fff1f0',
    borderRadius: 8,
  },
}); 