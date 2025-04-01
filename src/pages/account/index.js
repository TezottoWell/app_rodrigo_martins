import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/auth';
import { auth, db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import Logger from '../../utils/logger';

export default function Account() {
  const navigation = useNavigation();
  const { deleteAccount } = useAuth();
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome válido');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        name: newName.trim(),
        nameLower: newName.trim().toLowerCase()
      });
      
      Alert.alert('Sucesso', 'Nome atualizado com sucesso!');
      setNewName('');
    } catch (error) {
      Logger.error('Erro ao atualizar nome', error, {
        component: 'Account',
        action: 'updateName'
      });
      Alert.alert('Erro', 'Não foi possível atualizar o nome');
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erro', 'As novas senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      Alert.alert('Sucesso', 'Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      Logger.error('Erro ao atualizar senha', error, {
        component: 'Account',
        action: 'updatePassword'
      });
      Alert.alert('Erro', 'Senha atual incorreta ou erro ao atualizar senha');
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
          onPress: () => setShowDeleteConfirm(true)
        }
      ]
    );
  };

  const confirmDelete = async () => {
    if (!deletePassword) {
      Alert.alert('Erro', 'Por favor, digite sua senha');
      return;
    }

    try {
      await deleteAccount(deletePassword);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Erro', 'Senha incorreta');
      } else {
        Alert.alert('Erro', 'Não foi possível excluir sua conta. Tente novamente.');
      }
    } finally {
      setDeletePassword('');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conta</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeInUp" style={styles.section}>
          <Text style={styles.sectionTitle}>Alterar Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Novo nome"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor="#666"
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={handleUpdateName}
          >
            <Text style={styles.buttonText}>Atualizar Nome</Text>
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={200} style={styles.section}>
          <Text style={styles.sectionTitle}>Alterar Senha</Text>
          <View style={styles.passwordInput}>
            <TextInput
              style={styles.input}
              placeholder="Senha atual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <MaterialIcons 
                name={showCurrentPassword ? "visibility-off" : "visibility"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordInput}>
            <TextInput
              style={styles.input}
              placeholder="Nova senha"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <MaterialIcons 
                name={showNewPassword ? "visibility-off" : "visibility"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordInput}>
            <TextInput
              style={styles.input}
              placeholder="Confirme a nova senha"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <MaterialIcons 
                name={showConfirmPassword ? "visibility-off" : "visibility"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={handleUpdatePassword}
          >
            <Text style={styles.buttonText}>Atualizar Senha</Text>
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400} style={styles.section}>
          <Text style={styles.sectionTitle}>Exclusao permanente de conta</Text>
          <TouchableOpacity 
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <MaterialIcons name="delete-forever" size={24} color="#FFF" />
            <Text style={styles.deleteAccountButtonText}>Excluir Conta</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>

      {showDeleteConfirm && (
        <View style={styles.overlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Confirmar Exclusão</Text>
            <Text style={styles.confirmText}>
              Digite sua senha para confirmar a exclusão da conta
            </Text>
            <TextInput
              style={styles.confirmInput}
              placeholder="Sua senha"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholderTextColor="#666"
            />
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => {
                  setDeletePassword('');
                  setShowDeleteConfirm(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  section: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#1a1a1a',
  },
  passwordInput: {
    position: 'relative',
    marginBottom: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  button: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteAccountButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmDialog: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  confirmInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#1a1a1a',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 