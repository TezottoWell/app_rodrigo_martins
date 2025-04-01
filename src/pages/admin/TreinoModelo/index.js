import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function TreinoModelo() {
  const navigation = useNavigation();
  const [nivelSelecionado, setNivelSelecionado] = useState(null);
  const [treinosPorDia, setTreinosPorDia] = useState({});
  const [diaAtual, setDiaAtual] = useState(null);
  const [frequenciaTreino, setFrequenciaTreino] = useState(null);
  const [novoExercicio, setNovoExercicio] = useState({
    grupamentoMuscular: '',
    nome: '',
    repeticoes: '',
    series: '',
    observacao: '',
    linkExplicacao: ''
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCombinado, setIsCombinado] = useState(false);
  const [exerciciosCombinados, setExerciciosCombinados] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAddNivelModal, setShowAddNivelModal] = useState(false);
  const [novoNivel, setNovoNivel] = useState('');
  const [niveisPersonalizados, setNiveisPersonalizados] = useState([]);
  const [treinosModeloExistentes, setTreinosModeloExistentes] = useState({});
  const [treinoParaVisualizar, setTreinoParaVisualizar] = useState(null);
  const [treinoEmEdicao, setTreinoEmEdicao] = useState(null);
  const [showAtribuirModal, setShowAtribuirModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [treinoParaAtribuir, setTreinoParaAtribuir] = useState(null);

  const niveis = [
    { id: 'iniciante', label: 'Iniciante', icon: 'fitness-center' },
    { id: 'intermediario', label: 'Intermediário', icon: 'fitness-center' },
    { id: 'avancado', label: 'Avançado', icon: 'fitness-center' }
  ];

  const getDiaSemana = (numero) => {
    const diasSemana = {
      1: 'Segunda-Feira',
      2: 'Terça-Feira',
      3: 'Quarta-Feira',
      4: 'Quinta-Feira',
      5: 'Sexta-Feira',
      6: 'Sábado',
      7: 'Domingo'
    };
    return diasSemana[numero];
  };

  useEffect(() => {
    async function carregarNiveisPersonalizados() {
      try {
        const q = query(collection(db, 'niveisPersonalizados'));
        const querySnapshot = await getDocs(q);
        const niveis = [];
        
        querySnapshot.forEach((doc) => {
          niveis.push({
            id: doc.id,
            ...doc.data()
          });
        });

        setNiveisPersonalizados(niveis);
      } catch (error) {
        console.error('Erro ao carregar níveis personalizados:', error);
      }
    }

    carregarNiveisPersonalizados();
  }, []);

  useEffect(() => {
    async function carregarTreinosModelo() {
      try {
        const q = query(collection(db, 'treinosModelo'));
        const querySnapshot = await getDocs(q);
        const treinos = {};
        
        querySnapshot.forEach((doc) => {
          const treino = doc.data();
          // Agrupa por nível
          if (!treinos[treino.nivel]) {
            treinos[treino.nivel] = [];
          }
          treinos[treino.nivel].push({
            id: doc.id,
            ...treino
          });
        });
        
        setTreinosModeloExistentes(treinos);
      } catch (error) {
        console.error('Erro ao carregar treinos modelo:', error);
      }
    }

    carregarTreinosModelo();
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!hasUnsavedChanges) {
          return;
        }
        
        e.preventDefault();
        Alert.alert(
          'Alterações não salvas',
          'Você tem alterações não salvas. Deseja sair mesmo assim?',
          [
            {
              text: 'Ficar',
              style: 'cancel',
            },
            {
              text: 'Sair',
              onPress: () => {
                setHasUnsavedChanges(false);
                navigation.dispatch(e.data.action);
              },
              style: 'destructive',
            },
          ]
        );
      });

      return unsubscribe;
    }
  }, [hasUnsavedChanges, navigation]);

  async function salvarTreinoModelo() {
    try {
      // Validações
      if (!nivelSelecionado) {
        Alert.alert('Atenção', 'Selecione um nível');
        return;
      }

      if (!frequenciaTreino) {
        Alert.alert('Atenção', 'Selecione a frequência de treino');
        return;
      }

      if (Object.keys(treinosPorDia).length === 0) {
        Alert.alert('Atenção', 'Adicione exercícios ao treino');
        return;
      }

      // Verifica se há dias sem exercícios e os remove
      const treinosLimpos = {};
      let temExercicios = false;
      
      Object.entries(treinosPorDia).forEach(([dia, exercicios]) => {
        if (exercicios && exercicios.length > 0) {
          treinosLimpos[dia] = exercicios;
          temExercicios = true;
        }
      });

      // Se não houver nenhum exercício e for uma edição, exclui o treino
      if (!temExercicios && treinoEmEdicao) {
        await deleteDoc(doc(db, 'treinosModelo', treinoEmEdicao.id));
        
        setTreinosModeloExistentes(prev => {
          const newState = { ...prev };
          newState[nivelSelecionado] = newState[nivelSelecionado].filter(t => t.id !== treinoEmEdicao.id);
          if (newState[nivelSelecionado].length === 0) {
            delete newState[nivelSelecionado];
          }
          return newState;
        });

        // Limpa os estados
        setNivelSelecionado(null);
        setFrequenciaTreino(null);
        setTreinosPorDia({});
        setDiaAtual(null);
        setTreinoEmEdicao(null);
        setHasUnsavedChanges(false);

        Alert.alert(
          'Aviso', 
          'Treino modelo excluído por não conter exercícios.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Se não houver exercícios e for um novo treino, não permite salvar
      if (!temExercicios) {
        Alert.alert('Atenção', 'Adicione exercícios ao treino');
        return;
      }

      const treinoModeloData = {
        nivel: nivelSelecionado,
        dataCreated: treinoEmEdicao?.dataCreated || new Date(),
        frequenciaTreino,
        treinos: treinosLimpos, // Usa os treinos limpos
        nomeNivel: [...niveis, ...niveisPersonalizados].find(n => n.id === nivelSelecionado)?.label
      };

      if (treinoEmEdicao) {
        // Atualiza o treino existente
        await updateDoc(doc(db, 'treinosModelo', treinoEmEdicao.id), treinoModeloData);
        
        // Atualiza o estado local
        setTreinosModeloExistentes(prev => {
          const newState = { ...prev };
          const index = newState[nivelSelecionado].findIndex(t => t.id === treinoEmEdicao.id);
          if (index !== -1) {
            newState[nivelSelecionado][index] = {
              id: treinoEmEdicao.id,
              ...treinoModeloData
            };
          }
          return newState;
        });
      } else {
        // Cria um novo treino
        const docRef = await addDoc(collection(db, 'treinosModelo'), treinoModeloData);
        
        // Atualiza o estado local
        setTreinosModeloExistentes(prev => {
          const newState = { ...prev };
          if (!newState[nivelSelecionado]) {
            newState[nivelSelecionado] = [];
          }
          newState[nivelSelecionado].push({
            id: docRef.id,
            ...treinoModeloData
          });
          return newState;
        });
      }

      // Limpa os estados
      setNivelSelecionado(null);
      setFrequenciaTreino(null);
      setTreinosPorDia({});
      setDiaAtual(null);
      setTreinoEmEdicao(null);
      setHasUnsavedChanges(false);

      Alert.alert(
        'Sucesso', 
        `Treino modelo ${treinoEmEdicao ? 'atualizado' : 'cadastrado'} com sucesso!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Erro ao salvar treino modelo:', error);
      Alert.alert(
        'Erro',
        `Não foi possível ${treinoEmEdicao ? 'atualizar' : 'salvar'} o treino modelo. Tente novamente.`
      );
    }
  }

  const renderFrequenciaSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Frequência de Treino</Text>
      <View style={styles.frequenciaOptions}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.frequenciaButton,
              frequenciaTreino === num && styles.frequenciaButtonSelected
            ]}
            onPress={() => setFrequenciaTreino(num)}
          >
            <Text style={[
              styles.frequenciaButtonText,
              frequenciaTreino === num && styles.frequenciaButtonTextSelected
            ]}>{num}</Text>
            <Text style={[
              styles.frequenciaButtonSubtext,
              frequenciaTreino === num && styles.frequenciaButtonTextSelected
            ]}>
              {num === 1 ? 'dia' : 'dias'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDiaSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Selecione o dia para adicionar exercícios</Text>
      <View style={styles.diasOptions}>
        {Array.from({ length: frequenciaTreino }, (_, i) => i + 1).map((dia) => (
          <TouchableOpacity
            key={dia}
            style={[
              styles.diaButton,
              diaAtual === dia && styles.diaButtonSelected
            ]}
            onPress={() => setDiaAtual(dia)}
          >
            <Text style={[
              styles.diaButtonText,
              diaAtual === dia && styles.diaButtonTextSelected
            ]}>{getDiaSemana(dia)}</Text>
            {treinosPorDia[dia]?.length > 0 && (
              <Text style={styles.exerciciosCount}>
                {treinosPorDia[dia].length} exercício(s)
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  function addExercicioCombinado() {
    if (!novoExercicio.grupamentoMuscular || !novoExercicio.nome || !novoExercicio.repeticoes || !novoExercicio.series) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    const novoExercicioParaCombo = { ...novoExercicio };
    setExerciciosCombinados(prev => [...prev, novoExercicioParaCombo]);
    
    setNovoExercicio({
      grupamentoMuscular: '',
      nome: '',
      repeticoes: '',
      series: '',
      observacao: '',
      linkExplicacao: ''
    });
  }

  function finalizarCombo() {
    if (exerciciosCombinados.length < 2) {
      Alert.alert('Atenção', 'Adicione pelo menos 2 exercícios ao combo');
      return;
    }

    const exercicioCombinado = {
      tipo: 'combinado',
      exercicios: exerciciosCombinados
    };

    setTreinosPorDia(prev => ({
      ...prev,
      [diaAtual]: [...(prev[diaAtual] || []), exercicioCombinado]
    }));

    setExerciciosCombinados([]);
    setIsCombinado(false);
    setHasUnsavedChanges(true);
  }

  function addExercicio() {
    if (isCombinado) {
      addExercicioCombinado();
      return;
    }

    const camposObrigatorios = ['grupamentoMuscular', 'nome', 'repeticoes'];
    if (novoExercicio.grupamentoMuscular !== 'Cardio') {
      camposObrigatorios.push('series');
    }

    const camposVazios = camposObrigatorios.filter(campo => !novoExercicio[campo]);
    if (camposVazios.length > 0) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    const exercicioParaAdicionar = {
      ...novoExercicio,
      series: novoExercicio.grupamentoMuscular === 'Cardio' ? '1' : novoExercicio.series
    };

    setTreinosPorDia(prev => ({
      ...prev,
      [diaAtual]: [...(prev[diaAtual] || []), exercicioParaAdicionar]
    }));
    
    setHasUnsavedChanges(true);

    setNovoExercicio({
      grupamentoMuscular: '',
      nome: '',
      repeticoes: '',
      series: '',
      observacao: '',
      linkExplicacao: ''
    });
  }

  const renderGrupamentoDropdown = () => {
    const opcoes = [
      { label: "Selecione o grupamento muscular", value: "" },
      { label: "Peito", value: "Peito" },
      { label: "Costas", value: "Costas" },
      { label: "Ombro", value: "Ombro" },
      { label: "Trapézio", value: "Trapézio" },
      { label: "Biceps", value: "Biceps" },
      { label: "Triceps", value: "Triceps" },
      { label: "Membros Inferiores", value: "Membros Inferiores" },
      { label: "Abdomen", value: "Abdomen" },
      { label: "Cardio", value: "Cardio" },
      { label: "Mobilidade", value: "Mobilidade" }
    ];

    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Text style={styles.dropdownButtonText}>
            {novoExercicio.grupamentoMuscular || "Selecione o grupamento muscular"}
          </Text>
          <MaterialIcons 
            name={isDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>

        {isDropdownOpen && (
          <View style={styles.dropdownList}>
            <ScrollView 
              style={styles.dropdownScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {opcoes.map((opcao) => (
                <TouchableOpacity
                  key={opcao.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setNovoExercicio({...novoExercicio, grupamentoMuscular: opcao.value});
                    setIsDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    novoExercicio.grupamentoMuscular === opcao.value && styles.dropdownItemSelected
                  ]}>
                    {opcao.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const adicionarNovoNivel = async () => {
    if (!novoNivel.trim()) {
      Alert.alert('Atenção', 'Digite um nome para o nível');
      return;
    }

    try {
      const novoNivelObj = {
        label: novoNivel,
        icon: 'fitness-center'
      };

      // Salva no Firestore
      const docRef = await addDoc(collection(db, 'niveisPersonalizados'), novoNivelObj);

      // Atualiza o estado local
      setNiveisPersonalizados(prev => [...prev, {
        id: docRef.id,
        ...novoNivelObj
      }]);

      setNovoNivel('');
      setShowAddNivelModal(false);

      Alert.alert('Sucesso', 'Nível personalizado adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar nível personalizado:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o nível personalizado');
    }
  };

  const visualizarTreino = (treinos) => {
    setTreinoParaVisualizar(treinos);
  };

  const excluirTreinoModelo = async (treino) => {
    try {
      await deleteDoc(doc(db, 'treinosModelo', treino.id));
      
      // Atualiza o estado local
      setTreinosModeloExistentes(prev => {
        const newState = { ...prev };
        newState[treino.nivel] = newState[treino.nivel].filter(t => t.id !== treino.id);
        if (newState[treino.nivel].length === 0) {
          delete newState[treino.nivel];
        }
        return newState;
      });

      setTreinoParaVisualizar(null);
      Alert.alert('Sucesso', 'Treino modelo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir treino modelo:', error);
      Alert.alert('Erro', 'Não foi possível excluir o treino modelo');
    }
  };

  const iniciarEdicao = (treino) => {
    setTreinoParaVisualizar(null);
    setNivelSelecionado(treino.nivel);
    setFrequenciaTreino(treino.frequenciaTreino);
    setTreinosPorDia(treino.treinos);
    setTreinoEmEdicao(treino);
    setHasUnsavedChanges(true);
  };

  const excluirNivel = async (nivelId) => {
    try {
      // Verifica se existem treinos associados
      if (treinosModeloExistentes[nivelId]?.length > 0) {
        Alert.alert(
          'Atenção',
          'Existem treinos cadastrados neste nível. Exclua os treinos primeiro.'
        );
        return;
      }

      await deleteDoc(doc(db, 'niveisPersonalizados', nivelId));
      
      setNiveisPersonalizados(prev => 
        prev.filter(nivel => nivel.id !== nivelId)
      );

      Alert.alert('Sucesso', 'Nível excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir nível:', error);
      Alert.alert('Erro', 'Não foi possível excluir o nível');
    }
  };

  async function searchUsers(text) {
    if (text.length < 3) {
      setUsers([]);
      return;
    }

    try {
      const textLower = text.toLowerCase();
      const q = query(
        collection(db, 'users'),
        where('nameLower', '>=', textLower),
        where('nameLower', '<=', textLower + '\uf8ff'),
        where('isAdmin', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const usersList = [];
      querySnapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setUsers(usersList);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      Alert.alert('Erro', 'Erro ao buscar usuários');
    }
  }

  async function atribuirTreino(treino, user) {
    try {
      if (!treino) {
        throw new Error('Treino não encontrado');
      }

      // Verifica se já existe um treino igual para este usuário
      const treinosRef = collection(db, 'treinos');
      const q = query(
        treinosRef,
        where('userId', '==', user.id),
        where('frequenciaTreino', '==', treino.frequenciaTreino)
      );
      
      const querySnapshot = await getDocs(q);
      const treinosExistentes = [];
      
      querySnapshot.forEach((doc) => {
        const treinoData = doc.data();
        // Compara a estrutura dos treinos para verificar se são iguais
        if (JSON.stringify(treinoData.treinos) === JSON.stringify(treino.treinos)) {
          treinosExistentes.push(treinoData);
        }
      });

      if (treinosExistentes.length > 0) {
        Alert.alert(
          'Treino Duplicado',
          'Este usuário já possui este mesmo treino. Deseja atribuir mesmo assim?',
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Atribuir Mesmo Assim',
              onPress: async () => {
                await addDoc(collection(db, 'treinos'), {
                  userId: user.id,
                  userName: user.name,
                  dataCreated: new Date(),
                  frequenciaTreino: treino.frequenciaTreino,
                  treinos: treino.treinos
                });

                Alert.alert('Sucesso', 'Treino atribuído com sucesso!');
                setShowAtribuirModal(false);
                setSelectedUser(null);
                setSearchText('');
                setUsers([]);
                setTreinoParaAtribuir(null);
              }
            }
          ]
        );
        return;
      }

      // Se não existir duplicata, salva normalmente
      await addDoc(collection(db, 'treinos'), {
        userId: user.id,
        userName: user.name,
        dataCreated: new Date(),
        frequenciaTreino: treino.frequenciaTreino,
        treinos: treino.treinos
      });

      Alert.alert('Sucesso', 'Treino atribuído com sucesso!');
      setShowAtribuirModal(false);
      setSelectedUser(null);
      setSearchText('');
      setUsers([]);
      setTreinoParaAtribuir(null);
    } catch (error) {
      console.error('Erro ao atribuir treino:', error);
      Alert.alert('Erro', 'Não foi possível atribuir o treino');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a1a1a" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (hasUnsavedChanges) {
              Alert.alert(
                'Alterações não salvas',
                'Você tem alterações não salvas. Deseja sair mesmo assim?',
                [
                  {
                    text: 'Ficar',
                    style: 'cancel',
                  },
                  {
                    text: 'Sair',
                    onPress: () => {
                      setHasUnsavedChanges(false);
                      navigation.goBack();
                    },
                    style: 'destructive',
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Treino Modelo</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          {!nivelSelecionado ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selecione o Nível</Text>
              <View style={styles.niveisContainer}>
                {[...niveis, ...niveisPersonalizados].map(nivel => (
                  <View key={nivel.id} style={styles.nivelButton}>
                    <TouchableOpacity
                      style={styles.nivelButtonContent}
                      onPress={() => {
                        if (treinosModeloExistentes[nivel.id]?.length > 0) {
                          visualizarTreino(treinosModeloExistentes[nivel.id]);
                        } else {
                          setNivelSelecionado(nivel.id);
                        }
                      }}
                    >
                      <View style={styles.nivelIcon}>
                        <MaterialIcons 
                          name={nivel.icon} 
                          size={28} 
                          color={nivelSelecionado === nivel.id ? '#FFF' : '#1a1a1a'} 
                        />
                      </View>
                      <View style={styles.nivelInfo}>
                        <Text style={[
                          styles.nivelButtonText,
                          nivelSelecionado === nivel.id && styles.nivelButtonTextSelected
                        ]}>
                          {nivel.label}
                        </Text>
                        {treinosModeloExistentes[nivel.id]?.length > 0 && (
                          <Text style={styles.treinoExistenteText}>
                            {treinosModeloExistentes[nivel.id].length} treino(s) cadastrado(s)
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {!['iniciante', 'intermediario', 'avancado'].includes(nivel.id) && (
                      <TouchableOpacity
                        style={styles.deleteNivelButton}
                        onPress={() => {
                          Alert.alert(
                            'Confirmar Exclusão',
                            'Tem certeza que deseja excluir este nível?',
                            [
                              {
                                text: 'Cancelar',
                                style: 'cancel'
                              },
                              {
                                text: 'Excluir',
                                onPress: () => excluirNivel(nivel.id),
                                style: 'destructive'
                              }
                            ]
                          );
                        }}
                      >
                        <MaterialIcons name="delete" size={24} color="#dc3545" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addNivelButton}
                  onPress={() => setShowAddNivelModal(true)}
                >
                  <MaterialIcons name="add" size={28} color="#1a1a1a" />
                  <Text style={styles.addNivelText}>Adicionar Modelo Personalizado</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !frequenciaTreino ? (
            renderFrequenciaSelection()
          ) : !diaAtual ? (
            renderDiaSelection()
          ) : (
            <View style={styles.exerciciosContainer}>
              <TouchableOpacity 
                style={styles.voltarButton}
                onPress={() => setDiaAtual(null)}
              >
                <MaterialIcons name="arrow-back" size={24} color="#1a1a1a" />
                <Text style={styles.voltarButtonText}>Voltar para seleção de dias</Text>
              </TouchableOpacity>

              <View style={styles.exerciciosForm}>
                <View style={styles.combinadoCheckbox}>
                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => setIsCombinado(!isCombinado)}
                  >
                    <MaterialIcons 
                      name={isCombinado ? "check-box" : "check-box-outline-blank"} 
                      size={24} 
                      color="#1a1a1a" 
                    />
                    <Text style={styles.checkboxLabel}>Exercício Combinado</Text>
                  </TouchableOpacity>
                </View>

                {renderGrupamentoDropdown()}

                <TextInput
                  style={styles.input}
                  placeholder="Nome do exercício"
                  value={novoExercicio.nome}
                  onChangeText={(text) => setNovoExercicio({...novoExercicio, nome: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder={novoExercicio.grupamentoMuscular === 'Mobilidade' ? 'Tempo (ex: 30s)' : 'Repetições (ex: 8-12, 15)'}
                  value={novoExercicio.repeticoes}
                  onChangeText={(text) => setNovoExercicio({...novoExercicio, repeticoes: text})}
                />

                <TextInput
                  style={[
                    styles.input,
                    novoExercicio.grupamentoMuscular === 'Cardio' && styles.inputDisabled
                  ]}
                  placeholder="Séries (ex: 3)"
                  value={novoExercicio.series}
                  onChangeText={(text) => setNovoExercicio({...novoExercicio, series: text})}
                  editable={novoExercicio.grupamentoMuscular !== 'Cardio'}
                />

                <TextInput
                  style={[styles.input, styles.observacaoInput]}
                  placeholder="Observação (opcional)"
                  value={novoExercicio.observacao}
                  onChangeText={(text) => setNovoExercicio({...novoExercicio, observacao: text})}
                  multiline
                />

                <TextInput
                  style={styles.input}
                  placeholder="Link do vídeo (opcional)"
                  value={novoExercicio.linkExplicacao}
                  onChangeText={(text) => setNovoExercicio({...novoExercicio, linkExplicacao: text})}
                />

                {isCombinado ? (
                  <View style={styles.combinadosContainer}>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={addExercicioCombinado}
                    >
                      <MaterialIcons name="add" size={24} color="#FFF" />
                      <Text style={styles.buttonText}>Adicionar ao Combo</Text>
                    </TouchableOpacity>

                    {exerciciosCombinados.length > 0 && (
                      <>
                        <Text style={[styles.combinadosTitle, { marginTop: 20 }]}>
                          Exercícios no combo ({exerciciosCombinados.length})
                        </Text>
                        {exerciciosCombinados.map((exercicio, index) => (
                          <View key={index} style={styles.exercicioCombinadoItem}>
                            <Text style={styles.exercicioCombinadoNome}>
                              {exercicio.nome}
                            </Text>
                            <TouchableOpacity
                              style={styles.removeCombinadoButton}
                              onPress={() => {
                                setExerciciosCombinados(prev => 
                                  prev.filter((_, i) => i !== index)
                                );
                              }}
                            >
                              <MaterialIcons name="remove-circle" size={24} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        
                        <TouchableOpacity 
                          style={[styles.finalizarComboButton, { marginTop: 15 }]}
                          onPress={finalizarCombo}
                        >
                          <Text style={styles.buttonText}>Finalizar Combo</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={addExercicio}
                  >
                    <MaterialIcons name="add" size={24} color="#FFF" />
                    <Text style={styles.buttonText}>Adicionar Exercício</Text>
                  </TouchableOpacity>
                )}

                {treinosPorDia[diaAtual]?.length > 0 && (
                  <View style={styles.exerciciosLista}>
                    <Text style={styles.exerciciosListaTitle}>
                      Exercícios Adicionados
                    </Text>
                    
                    {treinosPorDia[diaAtual].map((item, index) => (
                      <View key={index} style={styles.exercicioItem}>
                        <View style={styles.exercicioHeader}>
                          <View style={styles.headerButtons}>
                            <TouchableOpacity 
                              style={styles.removeButton}
                              onPress={() => {
                                setTreinosPorDia(prev => ({
                                  ...prev,
                                  [diaAtual]: prev[diaAtual].filter((_, i) => i !== index)
                                }));
                                setHasUnsavedChanges(true);
                              }}
                            >
                              <MaterialIcons name="delete" size={24} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {item.tipo === 'combinado' ? (
                          <View style={styles.exercicioCombinadoContainer}>
                            <Text style={styles.combinadoTitle}>Exercícios Combinados</Text>
                            {item.exercicios.map((exercicio, idx) => (
                              <View key={idx} style={styles.exercicioCombinadoItem}>
                                <View style={styles.exercicioContent}>
                                  <Text style={styles.grupamentoText}>{exercicio.grupamentoMuscular}</Text>
                                  <Text style={styles.exercicioNome}>{exercicio.nome}</Text>
                                  <Text style={styles.exercicioDetalhes}>
                                    {exercicio.series}x{exercicio.repeticoes}
                                  </Text>
                                  {exercicio.observacao && (
                                    <Text style={styles.observacaoText}>Obs: {exercicio.observacao}</Text>
                                  )}
                                </View>
                                {exercicio.linkExplicacao && (
                                  <TouchableOpacity 
                                    style={styles.videoButton}
                                    onPress={() => Linking.openURL(exercicio.linkExplicacao)}
                                  >
                                    <MaterialIcons name="play-circle-filled" size={24} color="#FF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))}
                          </View>
                        ) : (
                          <>
                            <Text style={styles.grupamentoText}>{item.grupamentoMuscular}</Text>
                            <Text style={styles.exercicioNome}>{item.nome}</Text>
                            <Text style={styles.exercicioDetalhes}>
                              {item.series}x{item.repeticoes}
                            </Text>
                            {item.observacao && (
                              <Text style={styles.observacaoText}>Obs: {item.observacao}</Text>
                            )}
                            {item.linkExplicacao && (
                              <TouchableOpacity 
                                onPress={() => Linking.openURL(item.linkExplicacao)}
                              >
                                <Text style={styles.linkText}>Ver demonstração do exercício</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {hasUnsavedChanges && (
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={salvarTreinoModelo}
          >
            <MaterialIcons name="save" size={24} color="#FFF" />
            <Text style={styles.saveButtonText}>Salvar Treino Modelo</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {showAddNivelModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Nível</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Digite o nome do nível"
              value={novoNivel}
              onChangeText={setNovoNivel}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddNivelModal(false);
                  setNovoNivel('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={adicionarNovoNivel}
              >
                <Text style={styles.modalButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {treinoParaVisualizar && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '95%', maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Treinos {treinoParaVisualizar[0].nomeNivel}</Text>
            
            <ScrollView style={{ maxHeight: '80%' }}>
              {treinoParaVisualizar.map((treino, treinoIndex) => (
                <View key={treino.id} style={styles.treinoModalContainer}>
                  <Text style={styles.treinoModalSubtitle}>Treino {treinoIndex + 1}</Text>
                  
                  {Object.entries(treino.treinos).map(([dia, exercicios]) => (
                    <View key={dia} style={styles.treinoModalDia}>
                      <Text style={styles.treinoModalDiaTitle}>{getDiaSemana(Number(dia))}</Text>
                      
                      {exercicios.map((exercicio, index) => (
                        <View key={index} style={styles.treinoModalExercicio}>
                          {exercicio.tipo === 'combinado' ? (
                            <View style={styles.exercicioCombinadoContainer}>
                              <Text style={styles.combinadoTitle}>Exercícios Combinados</Text>
                              {exercicio.exercicios.map((ex, idx) => (
                                <View key={idx} style={styles.exercicioCombinadoItem}>
                                  <View style={styles.exercicioContent}>
                                    <Text style={styles.grupamentoText}>{ex.grupamentoMuscular}</Text>
                                    <Text style={styles.exercicioNome}>{ex.nome}</Text>
                                    <Text style={styles.exercicioDetalhes}>
                                      {ex.series}x{ex.repeticoes}
                                    </Text>
                                    {ex.observacao && (
                                      <Text style={styles.observacaoText}>Obs: {ex.observacao}</Text>
                                    )}
                                  </View>
                                  {ex.linkExplicacao && (
                                    <TouchableOpacity 
                                      style={styles.videoButton}
                                      onPress={() => Linking.openURL(ex.linkExplicacao)}
                                    >
                                      <MaterialIcons name="play-circle-filled" size={24} color="#FF4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              ))}
                            </View>
                          ) : (
                            <>
                              <Text style={styles.grupamentoText}>{exercicio.grupamentoMuscular}</Text>
                              <Text style={styles.exercicioNome}>{exercicio.nome}</Text>
                              <Text style={styles.exercicioDetalhes}>
                                {exercicio.series}x{exercicio.repeticoes}
                              </Text>
                              {exercicio.observacao && (
                                <Text style={styles.observacaoText}>Obs: {exercicio.observacao}</Text>
                              )}
                              {exercicio.linkExplicacao && (
                                <TouchableOpacity 
                                  onPress={() => Linking.openURL(exercicio.linkExplicacao)}
                                >
                                  <Text style={styles.linkText}>Ver demonstração do exercício</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}

                  <View style={styles.treinoModalActions}>
                    <TouchableOpacity 
                      style={[styles.treinoModalButton, { backgroundColor: '#ffc107' }]}
                      onPress={() => {
                        setTreinoParaAtribuir(treino);
                        setShowAtribuirModal(true);
                        setTreinoParaVisualizar(null);
                      }}
                    >
                      <Text style={[styles.treinoModalButtonText, { color: '#000' }]}>Atribuir a Usuário</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.treinoModalButton, { backgroundColor: '#dc3545' }]}
                      onPress={() => {
                        Alert.alert(
                          'Confirmar Exclusão',
                          'Tem certeza que deseja excluir este treino modelo?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              onPress: () => excluirTreinoModelo(treino),
                              style: 'destructive'
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.treinoModalButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setTreinoParaVisualizar(null)}
              >
                <Text style={styles.modalButtonText}>Fechar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setTreinoParaVisualizar(null);
                  setNivelSelecionado(treinoParaVisualizar[0].nivel);
                }}
              >
                <Text style={styles.modalButtonText}>Criar Novo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showAtribuirModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 600 }]}>
            <Text style={styles.modalTitle}>Atribuir Treino a Usuário</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Digite o nome do usuário (mínimo 3 letras)"
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                searchUsers(text);
              }}
              autoFocus
            />

            <View style={{ flex: 1 }}>
              {users.length > 0 ? (
                <ScrollView>
                  {users.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userItem}
                      onPress={() => {
                        atribuirTreino(treinoParaAtribuir, user);
                      }}
                    >
                      <Text style={styles.userName}>{user.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noUsersText}>
                  {searchText.length < 3 
                    ? 'Digite pelo menos 3 letras para buscar' 
                    : 'Nenhum usuário encontrado'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.atribuirModalButton, styles.modalButtonCancel]}
              onPress={() => {
                setShowAtribuirModal(false);
                setSearchText('');
                setUsers([]);
              }}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  niveisContainer: {
    flexDirection: 'column',
    gap: 15,
  },
  nivelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  nivelButtonSelected: {
    backgroundColor: '#1a1a1a',
  },
  nivelButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  nivelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  nivelButtonTextSelected: {
    color: '#FFF',
  },
  nivelIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequenciaOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  frequenciaButton: {
    width: 80,
    height: 80,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  frequenciaButtonSelected: {
    backgroundColor: '#1a1a1a',
  },
  frequenciaButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  frequenciaButtonTextSelected: {
    color: '#FFF',
  },
  frequenciaButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  diasOptions: {
    gap: 10,
  },
  diaButton: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  diaButtonSelected: {
    backgroundColor: '#1a1a1a',
  },
  diaButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  diaButtonTextSelected: {
    color: '#FFF',
  },
  exerciciosCount: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 20,
    borderRadius: 12,
    gap: 10,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciciosContainer: {
    flex: 1,
  },
  exerciciosForm: {
    flex: 1,
  },
  combinadoCheckbox: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 10,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownButton: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 15,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dropdownItemSelected: {
    backgroundColor: '#1a1a1a',
    color: '#FFF',
  },
  input: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  inputDisabled: {
    backgroundColor: '#EEE',
  },
  observacaoInput: {
    height: 100,
  },
  combinadosContainer: {
    marginBottom: 20,
  },
  combinadosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  exercicioCombinadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  exercicioCombinadoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  removeCombinadoButton: {
    padding: 5,
  },
  finalizarComboButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  voltarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 2,
  },
  voltarButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addNivelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    gap: 10,
    marginTop: 20,
    borderColor: '#1a1a1a',
    borderWidth: 1,
  },
  addNivelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#666',
  },
  modalButtonConfirm: {
    backgroundColor: '#28a745',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nivelInfo: {
    flex: 1,
  },
  treinoExistenteText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  treinoModalContainer: {
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  treinoModalSubtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  treinoModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  treinoModalDia: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  treinoModalDiaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  treinoModalExercicio: {
    marginBottom: 15,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#28a745',
  },
  treinoModalExercicioTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  treinoModalExercicioDetalhe: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  treinoModalObservacao: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  exerciciosLista: {
    marginTop: 20,
    marginBottom: 20,
  },
  exerciciosListaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  exercicioItem: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  exercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  exercicioTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  exercicioDetalhe: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  exercicioObservacao: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  deleteNivelButton: {
    padding: 8,
    marginLeft: 10,
  },
  exercicioCombinadoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  combinadoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  exercicioContent: {
    flex: 1,
  },
  exercicioDetalhes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  videoButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  linkText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  usersListContainer: {
    flex: 1,
    minHeight: 100,
    maxHeight: 400,
    marginBottom: 15,
  },
  userItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  userName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  noUsersText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontSize: 16,
  },
  modalFooter: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  treinoModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treinoModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  treinoModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  atribuirModalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    height: 50,
  }
}); 