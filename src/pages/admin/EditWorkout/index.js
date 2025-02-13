import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, Linking } from 'react-native';
import { collection, query, getDocs, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function EditWorkout() {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userWorkouts, setUserWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [treinosPorDia, setTreinosPorDia] = useState({});
  const [diaAtual, setDiaAtual] = useState(null);
  const [novoExercicio, setNovoExercicio] = useState({
    grupamentoMuscular: '',
    nome: '',
    repeticoes: '',
    series: '',
    observacao: '',
    linkExplicacao: ''
  });
  const [showExercicioForm, setShowExercicioForm] = useState(false);
  const [exercicioEmEdicao, setExercicioEmEdicao] = useState(null);
  const [indexEmEdicao, setIndexEmEdicao] = useState(null);
  const [isCombinado, setIsCombinado] = useState(false);
  const [exerciciosCombinados, setExerciciosCombinados] = useState([]);
  const [isEditingCombinado, setIsEditingCombinado] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigation = useNavigation();

  // Buscar usuários (igual à tela CreateWorkout)
  async function searchUsers(text) {
    if (text.length < 3) return;

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
      Alert.alert('Erro', 'Erro ao buscar usuários');
    }
  }

  // Buscar treinos do usuário selecionado
  async function fetchUserWorkouts(userId) {
    try {
      const q = query(
        collection(db, 'treinos'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const workoutsList = [];
      querySnapshot.forEach((doc) => {
        workoutsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setUserWorkouts(workoutsList);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao buscar treinos do usuário');
    }
  }

  // Selecionar treino para edição
  function handleSelectWorkout(workout) {
    setSelectedWorkout(workout);
    setTreinosPorDia(workout.treinos);
  }

  // Adicionar novo exercício ao dia
  function addExercicio() {
    if (!novoExercicio.grupamentoMuscular || !novoExercicio.nome || !novoExercicio.repeticoes || !novoExercicio.series) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    // Cria uma cópia do exercício para evitar referências
    const exercicioParaAdicionar = { ...novoExercicio };

    // Adiciona o exercício ao dia atual
    setTreinosPorDia(prev => ({
      ...prev,
      [diaAtual]: [...(prev[diaAtual] || []), exercicioParaAdicionar]
    }));

    // Limpa o formulário
    setNovoExercicio({
      grupamentoMuscular: '',
      nome: '',
      repeticoes: '',
      series: '',
      observacao: '',
      linkExplicacao: ''
    });
    
    setShowExercicioForm(false);
  }

  // Remover exercício
  function removeExercicio(diaIndex, exercicioIndex) {
    setTreinosPorDia(prev => ({
      ...prev,
      [diaIndex]: prev[diaIndex].filter((_, index) => index !== exercicioIndex)
    }));
  }

  // Salvar alterações
  async function salvarAlteracoes() {
    try {
      await updateDoc(doc(db, 'treinos', selectedWorkout.id), {
        treinos: treinosPorDia
      });

      // Atualiza o selectedWorkout com os novos treinos
      setSelectedWorkout(prev => ({
        ...prev,
        treinos: treinosPorDia
      }));

      Alert.alert('Sucesso', 'Treino atualizado com sucesso!');
      
      // Atualiza a lista de treinos
      await fetchUserWorkouts(selectedUser.id);
      
      // Volta para a seleção de dias
      setDiaAtual(null);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar treino');
    }
  }

  // Efeito para carregar treinos quando selecionar usuário
  useEffect(() => {
    if (selectedUser) {
      fetchUserWorkouts(selectedUser.id);
    }
  }, [selectedUser]);

  // Adicione esta função para apagar o treino completo
  function apagarTreino(treinoId) {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja realmente apagar este treino? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Apagar',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'treinos', treinoId));
              // Atualiza a lista de treinos
              fetchUserWorkouts(selectedUser.id);
              Alert.alert('Sucesso', 'Treino apagado com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Erro ao apagar treino');
            }
          },
          style: 'destructive'
        }
      ]
    );
  }

  // Renderização dos treinos do usuário
  const renderWorkoutList = () => (
    <View style={styles.workoutListContainer}>
      <Text style={styles.sectionTitle}>Treinos disponíveis</Text>
      <FlatList
        data={userWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.workoutItemContainer}>
            <TouchableOpacity
              style={styles.workoutItem}
              onPress={() => handleSelectWorkout(item)}
            >
              <View>
                <Text style={styles.workoutDate}>
                  {new Date(item.dataCreated.toDate()).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.workoutFreq}>
                  Frequência: {item.frequenciaTreino} dias por semana
                </Text>
              </View>
              <MaterialIcons name="edit" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteWorkoutButton}
              onPress={() => apagarTreino(item.id)}
            >
              <MaterialIcons name="delete" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>Nenhum treino encontrado</Text>
        )}
      />
    </View>
  );

  // Renderização da seleção de dias
  const renderDiaSelection = () => (
    <View style={styles.diasContainer}>
      <Text style={styles.sectionTitle}>Selecione o dia para editar exercícios</Text>
      <View style={styles.diasOptions}>
        {Array.from({ length: selectedWorkout.frequenciaTreino }, (_, i) => i + 1).map((dia) => (
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
            ]}>Dia {dia}</Text>
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

  // Adicione a função renderGrupamentoDropdown
  const renderGrupamentoDropdown = () => {
    const opcoes = [
      { label: "Selecione o grupamento muscular", value: "" },
      { label: "Peito", value: "Peito" },
      { label: "Costas", value: "Costas" },
      { label: "Ombro", value: "Ombro" },
      { label: "Trapézio", value: "Trapézio" },
      { label: "Biceps", value: "Biceps" },
      { label: "Triceps", value: "Triceps" },
      { label: "Perna", value: "Perna" },
      { label: "Gluteo", value: "Gluteo" },
      { label: "Panturrilha", value: "Panturrilha" },
      { label: "Abdomen", value: "Abdomen" },
      { label: "Cardio", value: "Cardio" }
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

  // Renderização do formulário de exercício
  const renderExercicioForm = () => (
    <View style={styles.exercicioFormContainer}>
      <TouchableOpacity 
        style={styles.toggleFormButton}
        onPress={() => {
          if (!showExercicioForm) {
            setShowExercicioForm(true);
          } else {
            // Limpa o formulário ao cancelar
            setNovoExercicio({
              grupamentoMuscular: '',
              nome: '',
              repeticoes: '',
              series: '',
              observacao: '',
              linkExplicacao: ''
            });
            setExercicioEmEdicao(null);
            setIndexEmEdicao(null);
            setShowExercicioForm(false);
            setIsCombinado(false);
            setExerciciosCombinados([]);
          }
        }}
      >
        <MaterialIcons 
          name={showExercicioForm ? "close" : "add"} 
          size={24} 
          color="#FFF" 
        />
        <Text style={styles.buttonText}>
          {showExercicioForm ? "Cancelar" : "Adicionar Exercício"}
        </Text>
      </TouchableOpacity>

      {showExercicioForm && (
        <View style={styles.exercicioForm}>
          <View style={styles.combinadoCheckbox}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => {
                setIsCombinado(!isCombinado);
                if (!isCombinado) {
                  setExerciciosCombinados([]);
                }
              }}
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
            placeholder="Nome do Exercício"
            value={novoExercicio.nome}
            onChangeText={(text) => setNovoExercicio({...novoExercicio, nome: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Repetições (ex: 8-12, 15)"
            value={novoExercicio.repeticoes}
            onChangeText={(text) => setNovoExercicio({...novoExercicio, repeticoes: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Séries"
            keyboardType="numeric"
            value={novoExercicio.series}
            onChangeText={(text) => setNovoExercicio({...novoExercicio, series: text})}
          />
          <TextInput
            style={[styles.input, styles.observacaoInput]}
            placeholder="Observação"
            value={novoExercicio.observacao}
            onChangeText={(text) => setNovoExercicio({...novoExercicio, observacao: text})}
            multiline
            numberOfLines={2}
          />
          <TextInput
            style={styles.input}
            placeholder="Link da explicação"
            value={novoExercicio.linkExplicacao}
            onChangeText={(text) => setNovoExercicio({...novoExercicio, linkExplicacao: text})}
            keyboardType="url"
            autoCapitalize="none"
          />

          {isCombinado && exerciciosCombinados.length > 0 && (
            <View style={styles.combinadosContainer}>
              <Text style={styles.combinadosTitle}>Exercícios no Combo:</Text>
              {exerciciosCombinados.map((exercicio, index) => (
                <View key={index} style={styles.exercicioCombinadoItem}>
                  <View style={styles.exercicioCombinadoContent}>
                    <Text style={styles.exercicioCombinadoNome}>
                      {index + 1}. {exercicio.nome} - {exercicio.series}x{exercicio.repeticoes}
                    </Text>
                    <Text style={styles.exercicioCombinadoGrupamento}>
                      {exercicio.grupamentoMuscular}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeExercicio(diaAtual, index)}
                    style={styles.removeCombinadoButton}
                  >
                    <MaterialIcons name="delete" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {exerciciosCombinados.length >= 2 && (
                <TouchableOpacity 
                  style={styles.finalizarComboButton}
                  onPress={finalizarCombo}
                >
                  <MaterialIcons name="check-circle" size={24} color="#FFF" />
                  <Text style={styles.buttonText}>Finalizar Edição do Combo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.formButtons}>
            <TouchableOpacity 
              style={[
                styles.formButton,
                { backgroundColor: exercicioEmEdicao ? '#2196F3' : '#28a745' }
              ]} 
              onPress={() => {
                if (isCombinado) {
                  addExercicioCombinado();
                } else if (exercicioEmEdicao) {
                  salvarEdicaoExercicio();
                } else {
                  addExercicio();
                }
              }}
            >
              <MaterialIcons 
                name={exercicioEmEdicao ? "save" : "check"} 
                size={24} 
                color="#FFF" 
              />
              <Text style={styles.buttonText}>
                {exercicioEmEdicao ? "Salvar Alterações" : "Adicionar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // Renderização da lista de exercícios usando ScrollView em vez de FlatList
  const renderExerciciosList = () => (
    <View style={styles.exerciciosListContainer}>
      <Text style={styles.sectionTitle}>Exercícios Cadastrados</Text>
      {treinosPorDia[diaAtual]?.length > 0 ? (
        treinosPorDia[diaAtual].map((item, index) => (
          <View key={`exercicio-lista-${index}`} style={styles.exercicioItem}>
            {item.tipo === 'combinado' ? (
              <View style={styles.exercicioCombinadoContainer}>
                <View style={styles.exercicioHeader}>
                  <Text style={styles.combinadoTitle}>Exercícios Combinados</Text>
                  <View style={styles.headerButtons}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditCombinado(item, index)}
                    >
                      <MaterialIcons name="edit" size={24} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeExercicio(diaAtual, index)}
                    >
                      <MaterialIcons name="delete" size={24} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.exercicios.map((exercicio, idx) => (
                  <View key={`combinado-${index}-exercicio-${idx}`} style={styles.exercicioCombinadoItem}>
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
              <View>
                <View style={styles.exercicioHeader}>
                  <Text style={styles.grupamentoText}>{item.grupamentoMuscular}</Text>
                  <View style={styles.headerButtons}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditExercicio(item, index)}
                    >
                      <MaterialIcons name="edit" size={24} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeExercicio(index)}
                    >
                      <MaterialIcons name="delete" size={24} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.exercicioNome}>{item.nome}</Text>
                <Text>{item.series} séries x {item.repeticoes} repetições</Text>
                {item.observacao && (
                  <Text style={styles.observacaoText}>Obs: {item.observacao}</Text>
                )}
              </View>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Nenhum exercício cadastrado para este dia</Text>
      )}
    </View>
  );

  function handleEditExercicio(exercicio, index) {
    // Verifica se é um exercício combinado
    if (exercicio.tipo === 'combinado') {
      handleEditCombinado(exercicio, index);
      return;
    }

    // Para exercícios normais
    setExercicioEmEdicao(exercicio);
    setIndexEmEdicao(index);
    setNovoExercicio({...exercicio}); // Cria uma cópia do exercício
    setShowExercicioForm(true);
  }

  function salvarEdicaoExercicio() {
    if (!novoExercicio.grupamentoMuscular || !novoExercicio.nome || !novoExercicio.repeticoes || !novoExercicio.series) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    setTreinosPorDia(prev => ({
      ...prev,
      [diaAtual]: prev[diaAtual].map((exercicio, index) => 
        index === indexEmEdicao ? {...novoExercicio} : exercicio
      )
    }));

    // Limpa o formulário e estados de edição
    setNovoExercicio({
      grupamentoMuscular: '',
      nome: '',
      repeticoes: '',
      series: '',
      observacao: '',
      linkExplicacao: ''
    });
    setExercicioEmEdicao(null);
    setIndexEmEdicao(null);
    setShowExercicioForm(false);
  }

  // Função para editar exercício combinado
  function handleEditCombinado(exercicioCombinado, index) {
    setIsEditingCombinado(true);
    setExerciciosCombinados([...exercicioCombinado.exercicios]); // Cria uma cópia do array
    setIndexEmEdicao(index);
    setIsCombinado(true);
    setShowExercicioForm(true);
  }

  // Função para remover exercício individual do combo durante a edição
  function removeExercicioDoCombo(exercicioIndex) {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja remover este exercício do combo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Remover',
          onPress: () => {
            const novosExercicios = exerciciosCombinados.filter((_, index) => index !== exercicioIndex);
            
            // Se sobrar apenas um exercício, converte para exercício normal
            if (novosExercicios.length === 1) {
              Alert.alert(
                'Atenção',
                'O combo será convertido em exercício normal pois terá apenas um exercício.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Atualiza o treino convertendo para exercício normal
                      setTreinosPorDia(prev => ({
                        ...prev,
                        [diaAtual]: prev[diaAtual].map((exercicio, index) => 
                          index === indexEmEdicao ? novosExercicios[0] : exercicio
                        )
                      }));

                      // Limpa os estados
                      setExerciciosCombinados([]);
                      setIsCombinado(false);
                      setShowExercicioForm(false);
                      setIsEditingCombinado(false);
                      setIndexEmEdicao(null);
                    }
                  }
                ]
              );
            } else {
              setExerciciosCombinados(novosExercicios);
            }
          },
          style: 'destructive'
        }
      ]
    );
  }

  // Função para salvar edição do combinado
  function finalizarCombo() {
    if (exerciciosCombinados.length < 2) {
      Alert.alert('Atenção', 'Adicione pelo menos 2 exercícios ao combo');
      return;
    }

    const exercicioCombinado = {
      tipo: 'combinado',
      exercicios: exerciciosCombinados
    };

    // Se estiver editando, atualiza o exercício existente
    if (isEditingCombinado && indexEmEdicao !== null) {
      setTreinosPorDia(prev => ({
        ...prev,
        [diaAtual]: prev[diaAtual].map((exercicio, index) => 
          index === indexEmEdicao ? exercicioCombinado : exercicio
        )
      }));
    } else {
      // Se não estiver editando, adiciona um novo exercício combinado
      setTreinosPorDia(prev => ({
        ...prev,
        [diaAtual]: [...(prev[diaAtual] || []), exercicioCombinado]
      }));
    }

    // Limpa os estados
    setExerciciosCombinados([]);
    setIsCombinado(false);
    setShowExercicioForm(false);
    setIsEditingCombinado(false);
    setIndexEmEdicao(null);
  }

  // Adicione estas funções para gerenciar exercícios combinados
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (diaAtual) {
              setDiaAtual(null); // Volta para seleção de dias
            } else if (selectedWorkout) {
              setSelectedWorkout(null); // Volta para lista de treinos
            } else if (selectedUser) {
              setSelectedUser(null); // Volta para seleção de usuário
            } else {
              navigation.goBack(); // Volta para tela anterior
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Treino</Text>
      </View>

      {!selectedUser && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuário..."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              searchUsers(text);
            }}
          />
          <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        </View>
      )}

      {!selectedUser ? (
        <View style={styles.userListContainer}>
          <Text style={styles.sectionTitle}>Selecione um aluno</Text>
          <FlatList
            data={users}
            keyExtractor={(item) => `user-${item.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => setSelectedUser(item)}
              >
                <MaterialIcons name="person" size={24} color="#1a1a1a" />
                <Text style={styles.userName}>{item.name}</Text>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {searchText.length < 3 
                  ? "Digite pelo menos 3 caracteres para buscar"
                  : "Nenhum usuário encontrado"}
              </Text>
            )}
          />
        </View>
      ) : !selectedWorkout ? (
        renderWorkoutList()
      ) : !diaAtual ? (
        renderDiaSelection()
      ) : (
        <View style={styles.diaContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.diaHeaderContainer}>
              <Text style={styles.diaTitle}>Dia {diaAtual}</Text>
            </View>
            
            <View style={styles.contentContainer}>
              {renderExercicioForm()}
              {renderExerciciosList()}

              <View style={styles.bottomButtons}>
                <TouchableOpacity 
                  style={styles.voltarButton} 
                  onPress={() => setDiaAtual(null)}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                  <Text style={styles.buttonText}>Voltar para Dias</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={salvarAlteracoes}
                >
                  <MaterialIcons name="save" size={24} color="#FFF" />
                  <Text style={styles.buttonText}>Salvar Alterações</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Para compensar o espaço do botão de voltar
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchIcon: {
    padding: 5,
  },
  userListContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  diasContainer: {
    padding: 20,
  },
  diasOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  diaButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    minWidth: '45%',
    alignItems: 'center',
    elevation: 2,
  },
  diaButtonSelected: {
    backgroundColor: '#1a1a1a',
  },
  diaButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  diaButtonTextSelected: {
    color: '#fff',
  },
  exerciciosCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  diaContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  diaHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 20,
  },
  diaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exercicioFormContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleFormButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  exercicioForm: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    width: '100%',
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  observacaoInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  exercicioItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  exercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  grupamentoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  exercicioNome: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  exercicioDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#444',
  },
  observacaoText: {
    color: '#666',
    fontSize: 15,
    marginTop: 10,
    backgroundColor: '#fff9e6',
    padding: 10,
    borderRadius: 8,
  },
  linkText: {
    color: '#0066cc',
    fontSize: 15,
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#fff0f0',
    borderRadius: 8,
  },
  workoutListContainer: {
    flex: 1,
    padding: 20,
  },
  workoutItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  workoutItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    elevation: 3,
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  workoutFreq: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  exerciciosListContainer: {
    marginTop: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 20,
  },
  voltarButton: {
    flex: 1,
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  combinadoCheckbox: {
    marginBottom: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  combinadosContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  combinadosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  exercicioCombinadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  exercicioCombinadoContent: {
    flex: 1,
    marginRight: 10,
  },
  exercicioCombinadoNome: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  exercicioCombinadoGrupamento: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  removeCombinadoButton: {
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  finalizarComboButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  exercicioCombinadoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  exercicioContent: {
    flex: 1,
  },
  exercicioDetalhes: {
    fontSize: 14,
    color: '#666',
  },
  videoButton: {
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  formButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  deleteWorkoutButton: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  dropdownContainer: {
    marginBottom: 18,
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#dce0e6',
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#FFF',
    minHeight: 55,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: '#dce0e6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 150,
  },
  dropdownScroll: {
    width: '100%',
  },
  dropdownItem: {
    padding: 15,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dropdownItemSelected: {
    color: '#28a745',
    fontWeight: 'bold',
  },
}); 