import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../utils/logger';

export default function ManageUsers() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const delayDebounce = setTimeout(() => {
        searchUsers();
      }, 500);

      return () => clearTimeout(delayDebounce);
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const searchLower = searchQuery.toLowerCase();
      const q = query(usersRef, 
        where('nameLower', '>=', searchLower), 
        where('nameLower', '<=', searchLower + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      
      setUsers(usersData);
    } catch (error) {
      Logger.error('Erro ao buscar usuários', error, {
        component: 'ManageUsers',
        action: 'fetchUsers'
      });
      alert('Erro ao buscar usuários');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        planoAtivo: !currentStatus
      });
      
      // Atualiza a lista local
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, planoAtivo: !currentStatus };
        }
        return user;
      }));
      
    } catch (error) {
      Logger.error('Erro ao atualizar status do usuário', error, {
        component: 'ManageUsers',
        action: 'handleStatusChange',
        userId,
        currentStatus
      });
      alert('Erro ao atualizar status do usuário');
    }
  };

  const toggleUserAdmin = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isAdmin: !currentStatus
      });
      
      // Atualiza a lista local
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, isAdmin: !currentStatus };
        }
        return user;
      }));
      
    } catch (error) {
      Logger.error('Erro ao atualizar status admin do usuário', error, {
        component: 'ManageUsers',
        action: 'handleAdminStatusChange',
        userId,
        currentStatus
      });
      alert('Erro ao atualizar permissões do usuário');
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.statusButton, item.planoAtivo ? styles.statusActive : styles.statusInactive]}
          onPress={() => toggleUserStatus(item.id, item.planoAtivo)}
        >
          <Text style={styles.statusText}>
            {item.planoAtivo ? 'Ativo' : 'Inativo'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.adminButton, item.isAdmin ? styles.adminActive : styles.adminInactive]}
          onPress={() => toggleUserAdmin(item.id, item.isAdmin)}
        >
          <Text style={styles.statusText}>
            {item.isAdmin ? 'Admin' : 'Usuário'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInLeft" style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Usuários</Text>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>

        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.userList}
        />
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
    marginTop: 65,
    paddingVertical: 20,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  userList: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  adminButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  adminActive: {
    backgroundColor: '#2196F3',
  },
  adminInactive: {
    backgroundColor: '#757575',
  },
}); 