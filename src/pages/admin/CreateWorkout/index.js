import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, KeyboardAvoidingView, Platform, Keyboard, Animated, TouchableWithoutFeedback, Linking } from 'react-native';
import { collection, query, getDocs, addDoc, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../../utils/logger';

export default function CreateWorkout() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [frequenciaTreino, setFrequenciaTreino] = useState(null);
  const [treinosPorDia, setTreinosPorDia] = useState({});
  const [novoExercicio, setNovoExercicio] = useState({
    grupamentoMuscular: '',
    nome: '',
    repeticoes: '',
    series: '',
    observacao: '',
    linkExplicacao: ''
  });
  const [diaAtual, setDiaAtual] = useState(null);
  const [existingWorkout, setExistingWorkout] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCombinado, setIsCombinado] = useState(false);
  const [exerciciosCombinados, setExerciciosCombinados] = useState([]);
  const [isAddingToCombinado, setIsAddingToCombinado] = useState(false);
  const [exercicioEmEdicao, setExercicioEmEdicao] = useState(null);
  const [indexEmEdicao, setIndexEmEdicao] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRepetirForm, setShowRepetirForm] = useState(false);
  const [diaOrigem, setDiaOrigem] = useState('');
  const [diaDestino, setDiaDestino] = useState('');
  const [isOrigemDropdownOpen, setIsOrigemDropdownOpen] = useState(false);
  const [isDestinoDropdownOpen, setIsDestinoDropdownOpen] = useState(false);

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

  // Buscar usuários
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
      Logger.error('Erro ao buscar usuários', error, {
        component: 'CreateWorkout',
        action: 'searchUsers',
        line: 55
      });
      Alert.alert('Erro', 'Erro ao buscar usuários');
    }
  }

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
    setIsAddingToCombinado(false);
    setIsCombinado(false);
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

  async function salvarTreino() {
    if (!selectedUser || !frequenciaTreino || Object.keys(treinosPorDia).length === 0) {
      Alert.alert('Atenção', 'Preencha todas as informações necessárias');
      return;
    }

    try {
      await addDoc(collection(db, 'treinos'), {
        userId: selectedUser.id,
        userName: selectedUser.name,
        dataCreated: new Date(),
        frequenciaTreino,
        treinos: treinosPorDia
      });

      setHasUnsavedChanges(false);
      Alert.alert('Sucesso', 'Treino cadastrado com sucesso!');
      setSelectedUser(null);
      setFrequenciaTreino(null);
      setTreinosPorDia({});
      setDiaAtual(null);
    } catch (error) {
      Logger.error('Erro ao salvar treino', error, {
        component: 'CreateWorkout',
        action: 'salvarTreino',
        line: 148
      });
      Alert.alert('Erro', 'Erro ao salvar treino');
    }
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

  const renderFrequenciaSelection = () => (
    <View style={styles.frequenciaContainer}>
      <View style={styles.frequenciaHeader}>
        <MaterialIcons name="calendar-today" size={24} color="#1a1a1a" />
        <Text style={styles.sectionTitle}>Selecione a frequência de treino</Text>
      </View>
      
      <Text style={styles.frequenciaSubtitle}>Quantos dias por semana o aluno irá treinar?</Text>
      
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
    <>
      <View style={styles.diasContainer}>
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

        <View style={styles.botoesContainer}>
          <TouchableOpacity
            style={styles.repetirButton}
            onPress={() => setShowRepetirForm(true)}
          >
            <MaterialIcons name="content-copy" size={24} color="#FFF" />
            <Text style={styles.buttonText}>Repetir Treino</Text>
          </TouchableOpacity>

          {Object.keys(treinosPorDia).length > 0 && (
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={salvarTreino}
            >
              <MaterialIcons name="save" size={24} color="#FFF" />
              <Text style={styles.buttonText}>Salvar Treino</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal separado do container principal */}
      {showRepetirForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.repetirFormContainer}>
            <View style={styles.repetirFormContent}>
              <Text style={styles.repetirFormTitle}>Repetir Treino</Text>
              
              <View style={styles.repetirFormField}>
                <Text style={styles.repetirFormLabel}>Copiar dia de:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => {
                    setIsOrigemDropdownOpen(!isOrigemDropdownOpen);
                    setIsDestinoDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownButtonText}>
                    {diaOrigem ? getDiaSemana(Number(diaOrigem)) : "Selecione o dia de origem"}
                  </Text>
                  <MaterialIcons 
                    name={isOrigemDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {isOrigemDropdownOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {Object.keys(treinosPorDia)
                        .filter(dia => treinosPorDia[dia]?.length > 0)
                        .map((dia) => (
                          <TouchableOpacity
                            key={`origem-${dia}`}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setDiaOrigem(dia);
                              setIsOrigemDropdownOpen(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              diaOrigem === dia && styles.dropdownItemSelected
                            ]}>
                              {getDiaSemana(Number(dia))}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.repetirFormFieldSecond}>
                <Text style={styles.repetirFormLabel}>Atribuir a:</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => {
                    setIsDestinoDropdownOpen(!isDestinoDropdownOpen);
                    setIsOrigemDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownButtonText}>
                    {diaDestino ? getDiaSemana(Number(diaDestino)) : "Selecione o dia de destino"}
                  </Text>
                  <MaterialIcons 
                    name={isDestinoDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {isDestinoDropdownOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {Array.from({ length: frequenciaTreino }, (_, i) => (i + 1).toString())
                        .filter(dia => dia !== diaOrigem)
                        .map((dia) => (
                          <TouchableOpacity
                            key={`destino-${dia}`}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setDiaDestino(dia);
                              setIsDestinoDropdownOpen(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              diaDestino === dia && styles.dropdownItemSelected
                            ]}>
                              {getDiaSemana(Number(dia))}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.repetirFormButtons}>
                <TouchableOpacity 
                  style={[styles.repetirFormButton, styles.repetirFormButtonCancel]}
                  onPress={() => {
                    setShowRepetirForm(false);
                    setDiaOrigem('');
                    setDiaDestino('');
                    setIsOrigemDropdownOpen(false);
                    setIsDestinoDropdownOpen(false);
                  }}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.repetirFormButton, styles.repetirFormButtonConfirm]}
                  onPress={handleRepetirTreino}
                >
                  <Text style={styles.buttonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  );

  const renderExerciciosCombinados = () => (
    <View style={styles.combinadosContainer}>
      <Text style={styles.combinadosTitle}>Exercícios no Combo:</Text>
      {exerciciosCombinados.map((exercicio, index) => (
        <View key={index} style={styles.exercicioCombinadoItem}>
          <Text style={styles.exercicioCombinadoNome}>
            {index + 1}. {exercicio.nome} - {exercicio.series}x{exercicio.repeticoes}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setExerciciosCombinados(prev => 
                prev.filter((_, i) => i !== index)
              );
            }}
            style={styles.removeCombinadoButton}
          >
            <MaterialIcons name="close" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      ))}
      
      {exerciciosCombinados.length >= 2 && (
        <TouchableOpacity 
          style={styles.finalizarComboButton}
          onPress={finalizarCombo}
        >
          <MaterialIcons name="check-circle" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Finalizar Combo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderExercicioForm = () => (
    <KeyboardAvoidingView 
      style={styles.exercicioFormContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.combinadoCheckbox}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => {
            setIsCombinado(!isCombinado);
            if (!isCombinado) {
              setIsAddingToCombinado(true);
            } else {
              setExerciciosCombinados([]);
              setIsAddingToCombinado(false);
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

      <ScrollView 
        style={styles.exercicioFormScroll}
        contentContainerStyle={styles.exercicioFormContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {renderGrupamentoDropdown()}
        <TextInput
          style={styles.input}
          placeholder="Nome do Exercício"
          value={novoExercicio.nome}
          onChangeText={(text) => setNovoExercicio({...novoExercicio, nome: text})}
          returnKeyType="next"
          locale="pt-BR"
          textContentType="none"
        />
        <TextInput
          style={styles.input}
          placeholder={['Mobilidade', 'Cardio'].includes(novoExercicio.grupamentoMuscular) 
            ? 'Tempo (ex: 30s)' 
            : 'Repetições (ex: 8-12, 15)'}
          placeholderTextColor={'#666'}
          value={novoExercicio.repeticoes}
          onChangeText={(text) => setNovoExercicio({...novoExercicio, repeticoes: text})}
          returnKeyType="next"
          autoCorrect={true}
          autoCapitalize="none"
          keyboardType="default"
          locale="pt-BR"
          textContentType="none"
        />
        <TextInput
          style={[
            styles.input,
            novoExercicio.grupamentoMuscular === 'Cardio' && styles.inputDisabled
          ]}
          placeholder="Séries (ex: 3)"
          placeholderTextColor={'#666'}
          value={novoExercicio.series}
          onChangeText={(text) => setNovoExercicio({...novoExercicio, series: text})}
          editable={novoExercicio.grupamentoMuscular !== 'Cardio'}
          returnKeyType="next"
          autoCorrect={true}
          autoCapitalize="none"
          keyboardType="numeric"
          locale="pt-BR"
          textContentType="none"
        />
        <TextInput
          style={[styles.input, styles.observacaoInput]}
          placeholder="Observação"
          value={novoExercicio.observacao}
          onChangeText={(text) => setNovoExercicio({...novoExercicio, observacao: text})}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          locale="pt-BR"
          textContentType="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Link da explicação"
          value={novoExercicio.linkExplicacao}
          onChangeText={(text) => setNovoExercicio({...novoExercicio, linkExplicacao: text})}
          keyboardType="url"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          locale="pt-BR"
          textContentType="none"
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => {
              addExercicio();
              Keyboard.dismiss();
            }}
          >
            <MaterialIcons name="add" size={24} color="#FFF" />
            <Text style={styles.buttonText}>Adicionar Exercício</Text>
          </TouchableOpacity>
        </View>

        {isCombinado && exerciciosCombinados.length > 0 && renderExerciciosCombinados()}

        <FlatList
          data={treinosPorDia[diaAtual] || []}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <View style={styles.exercicioItem}>
              <View style={styles.exercicioHeader}>
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
                <View>
                  <Text style={styles.grupamentoText}>{item.grupamentoMuscular}</Text>
                  <Text style={styles.exercicioNome}>{item.nome}</Text>
                  <Text>{item.series} séries x {item.repeticoes} repetições</Text>
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
                </View>
              )}
            </View>
          )}
        />
      </ScrollView>

      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity 
          style={styles.voltarButton} 
          onPress={() => {
            setDiaAtual(null);
          }}
        >
          <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          <Text style={styles.buttonText}>Voltar para Dias</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  async function handleUserSelection(user) {
    try {
      const q = query(
        collection(db, 'treinos'),
        where('userId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        Alert.alert(
          'Treino Existente',
          'Este usuário já possui um treino cadastrado. O que deseja fazer?',
          [
            {
              text: 'Criar Novo',
              onPress: () => setSelectedUser(user)
            },
            {
              text: 'Editar Existente',
              onPress: () => {
                // Aqui você pode navegar para a tela de edição
                // Assumindo que você está usando react-navigation
                navigation.navigate('EditWorkout', { 
                  workoutId: querySnapshot.docs[0].id,
                  workout: querySnapshot.docs[0].data()
                });
              }
            },
            {
              text: 'Cancelar',
              style: 'cancel'
            }
          ]
        );
      } else {
        setSelectedUser(user);
      }
    } catch (error) {
      Logger.error('Erro ao verificar treino existente', error, {
        component: 'CreateWorkout',
        action: 'handleUserSelection',
        line: 548
      });
      Alert.alert('Erro', 'Erro ao verificar treino existente');
    }
  }

  function handleEditExercicio(exercicio, index) {
    setNovoExercicio(exercicio);
    setExercicioEmEdicao(exercicio);
    setIndexEmEdicao(index);
  }

  function removeExercicio(index) {
    Alert.alert(
      'Confirmar',
      'Deseja remover este exercício?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Remover',
          onPress: () => {
            setTreinosPorDia(prev => ({
              ...prev,
              [diaAtual]: prev[diaAtual].filter((_, idx) => idx !== index)
            }));
          },
          style: 'destructive'
        }
      ]
    );
  }

  const handleRepetirTreino = () => {
    if (!diaOrigem || !diaDestino) {
      Alert.alert('Atenção', 'Selecione os dias de origem e destino');
      return;
    }

    if (diaOrigem === diaDestino) {
      Alert.alert('Atenção', 'Os dias de origem e destino devem ser diferentes');
      return;
    }

    if (!treinosPorDia[diaOrigem]?.length) {
      Alert.alert('Atenção', 'O dia de origem não possui exercícios');
      return;
    }

    if (treinosPorDia[diaDestino]?.length > 0) {
      Alert.alert(
        'Atenção',
        'O dia de destino já possui exercícios. Deseja substituí-los?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Substituir',
            onPress: () => copiarExercicios(),
            style: 'destructive'
          }
        ]
      );
    } else {
      Alert.alert(
        'Confirmar',
        `Deseja copiar os exercícios de ${getDiaSemana(Number(diaOrigem))} para ${getDiaSemana(Number(diaDestino))}?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Confirmar',
            onPress: () => copiarExercicios()
          }
        ]
      );
    }
  };

  const copiarExercicios = () => {
    setTreinosPorDia(prev => ({
      ...prev,
      [diaDestino]: [...treinosPorDia[diaOrigem]]
    }));
    
    setHasUnsavedChanges(true);
    setShowRepetirForm(false);
    setDiaOrigem('');
    setDiaDestino('');
    Alert.alert('Sucesso', 'Exercícios copiados com sucesso!');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (hasUnsavedChanges && treinosPorDia[diaAtual]?.length > 0) {
              Alert.alert(
                'Alterações não salvas',
                'Existem alterações não salvas. O que você deseja fazer?',
                [
                  {
                    text: 'Salvar',
                    onPress: async () => {
                      await salvarTreino();
                      if (diaAtual) {
                        setDiaAtual(null);
                      } else if (frequenciaTreino) {
                        setFrequenciaTreino(null);
                      } else if (selectedUser) {
                        setSelectedUser(null);
                      } else {
                        navigation.goBack();
                      }
                    }
                  },
                  {
                    text: 'Descartar',
                    onPress: () => {
                      setHasUnsavedChanges(false);
                      if (diaAtual) {
                        setDiaAtual(null);
                      } else if (frequenciaTreino) {
                        setFrequenciaTreino(null);
                      } else if (selectedUser) {
                        setSelectedUser(null);
                      } else {
                        navigation.goBack();
                      }
                    },
                    style: 'destructive'
                  },
                  {
                    text: 'Cancelar',
                    style: 'cancel'
                  }
                ]
              );
            } else {
              if (frequenciaTreino && !diaAtual && Object.keys(treinosPorDia).length > 0) {
                Alert.alert(
                  'Salvar Treino',
                  'Deseja salvar o treino antes de voltar?',
                  [
                    {
                      text: 'Salvar',
                      onPress: async () => {
                        await salvarTreino();
                      }
                    },
                    {
                      text: 'Voltar sem Salvar',
                      onPress: () => {
                        setFrequenciaTreino(null);
                        setTreinosPorDia({});
                      },
                      style: 'destructive'
                    },
                    {
                      text: 'Cancelar',
                      style: 'cancel'
                    }
                  ]
                );
              } else {
                if (diaAtual) {
                  setDiaAtual(null);
                } else if (frequenciaTreino) {
                  setFrequenciaTreino(null);
                } else if (selectedUser) {
                  setSelectedUser(null);
                } else {
                  navigation.goBack();
                }
              }
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Treino</Text>
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
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => handleUserSelection(item)}
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
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.selectedUserHeader}>
            <Text style={styles.selectedUserText}>
              Criando treino para: {selectedUser.name}
            </Text>
          </View>

          {!frequenciaTreino ? (
            renderFrequenciaSelection()
          ) : !diaAtual ? (
            renderDiaSelection()
          ) : (
            renderExercicioForm()
          )}
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
      marginRight: 40,
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
      borderLeftWidth: 0,
      marginTop: 18,
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
    workoutContainer: {
      flex: 1,
      backgroundColor: '#FFF',
    },
    workoutContentContainer: {
      padding: 15,
      paddingBottom: 100,
    },
    selectedUserHeader: {
      backgroundColor: '#f5f5f5',
      padding: 15,
      borderRadius: 8,
      marginBottom: 20,
    },
    selectedUserText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    exercicioFormContainer: {
      flex: 1,
      backgroundColor: '#fff',
    },
    exercicioFormScroll: {
      flex: 1,
    },
    exercicioFormContent: {
      padding: 20,
      paddingBottom: 100,
    },
    input: {
      borderWidth: 1.5,
      borderColor: '#dce0e6',
      borderRadius: 20,
      marginBottom: 18,
      padding: 18,
      backgroundColor: '#FFF',
      minHeight: 55,
      fontSize: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    addButton: {
      backgroundColor: '#28a745',
      padding: 15,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      backgroundColor: '#28a745',
      padding: 15,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    exercicioItem: {
      backgroundColor: '#fff',
      padding: 20,
      borderRadius: 12,
      marginBottom: 15,
      elevation: 3,
      borderLeftWidth: 0,
    },
    exercicioNome: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    frequenciaContainer: {
      backgroundColor: '#fff',
      borderRadius: 15,
      padding: 20,
      margin: 15,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    frequenciaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      gap: 10,
    },
    frequenciaSubtitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 20,
    },
    frequenciaOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
    },
    frequenciaButton: {
      backgroundColor: '#f5f5f5',
      width: 80,
      height: 80,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    frequenciaButtonSelected: {
      backgroundColor: '#1a1a1a',
    },
    frequenciaButtonText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    frequenciaButtonSubtext: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    frequenciaButtonTextSelected: {
      color: '#fff',
    },
    diasContainer: {
      flex: 1,
      padding: 20,
      position: 'relative',
    },
    diasOptions: {
      gap: 10,
      marginTop: 20,
    },
    diaButton: {
      backgroundColor: '#fff',
      padding: 15,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      elevation: 2,
      marginBottom: 10,
      borderLeftWidth: 0,
    },
    diaButtonSelected: {
      backgroundColor: '#1a1a1a',
    },
    diaButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    exerciciosCount: {
      fontSize: 14,
      color: '#666',
    },
    diaContainer: {
      flex: 1,
    },
    diaContainerScroll: {
      padding: 20,
      flexGrow: 1,
    },
    diaTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    grupamentoText: {
      fontSize: 14,
      color: '#666',
      marginBottom: 5,
    },
    voltarButton: {
      backgroundColor: '#666',
      padding: 15,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 20,
      marginTop: 0,
    },
    observacaoInput: {
      minHeight: 100,
      maxHeight: 150,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    observacaoText: {
      color: '#666',
      fontSize: 14,
      marginTop: 5,
      fontStyle: 'italic',
    },
    linkText: {
      color: '#0066cc',
      fontSize: 14,
      marginTop: 5,
      textDecorationLine: 'underline',
    },
    buttonContainer: {
      paddingVertical: 20,
      marginTop: 10,
    },
    bottomButtonsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
    },
    pickerContainer: {
      borderWidth: 1.5,
      borderColor: '#dce0e6',
      borderRadius: 20,
      marginBottom: 18,
      backgroundColor: '#FFF',
      overflow: 'hidden',
    },
    picker: {
      height: Platform.OS === 'ios' ? 150 : 55,
      width: '100%',
      marginLeft: Platform.OS === 'android' ? 10 : 0,
      color: '#1a1a1a',
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
      minHeight: 50,
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
      borderRadius: 8,
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
      maxHeight: 200,
      zIndex: 1000,
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
    exercicioCombinadoNome: {
      fontSize: 14,
      color: '#1a1a1a',
    },
    removeCombinadoButton: {
      padding: 5,
    },
    finalizarComboButton: {
      backgroundColor: '#28a745',
      padding: 15,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
    exercicioHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
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
    removeButton: {
      padding: 8,
      backgroundColor: '#ffebee',
      borderRadius: 8,
    },
    repetirButton: {
      backgroundColor: '#1a1a1a',
      height: 50,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
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
      zIndex: 9999,
    },
    repetirFormContainer: {
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    repetirFormContent: {
      width: '100%',
      position: 'relative',
    },
    repetirFormTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: '#1a1a1a',
    },
    repetirFormField: {
      marginBottom: 20,
      position: 'relative',
      zIndex: 3,
    },
    repetirFormLabel: {
      fontSize: 16,
      marginBottom: 8,
      color: '#1a1a1a',
      fontWeight: '500',
    },
    repetirFormButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 25,
      gap: 10,
    },
    repetirFormButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      elevation: 2,
    },
    repetirFormButtonCancel: {
      backgroundColor: '#666',
    },
    repetirFormButtonConfirm: {
      backgroundColor: '#28a745',
    },
    repetirFormFieldSecond: {
      marginBottom: 20,
      position: 'relative',
      zIndex: 2,
    },
    botoesContainer: {
      marginTop: 20,
      gap: 15,
      paddingHorizontal: 20,
    },
    botaoBase: {
      height: 50,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    inputDisabled: {
      backgroundColor: '#f5f5f5',
      color: '#999',
    },
  });