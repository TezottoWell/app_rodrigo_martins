import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking, Alert, TextInput, Keyboard, ScrollView } from 'react-native';
import { collection, query, getDocs, where, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { signOut } from 'firebase/auth';
import Logger from '../../utils/logger';

export default function Treinos({ route }) {
  const [treinos, setTreinos] = useState([]);
  const [treinoSelecionado, setTreinoSelecionado] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [treinoEmAndamento, setTreinoEmAndamento] = useState(false);
  const [diaAtual, setDiaAtual] = useState(null);
  const [exerciciosRestantes, setExerciciosRestantes] = useState([]);
  const [exerciciosConcluidos, setExerciciosConcluidos] = useState([]);
  const [tempoInicio, setTempoInicio] = useState(null);
  const [mostrarParabens, setMostrarParabens] = useState(false);
  const [tempoTotal, setTempoTotal] = useState(null);
  const [contadorInicio, setContadorInicio] = useState(5);
  const [contadorAtivo, setContadorAtivo] = useState(false);
  const [showAllConcluidos, setShowAllConcluidos] = useState(false);
  const [treinoEditando, setTreinoEditando] = useState(null);
  const [diasConcluidos, setDiasConcluidos] = useState([]);
  const navigation = useNavigation();

  const isNovaSemana = (ultimaData) => {
    if (!ultimaData) return true;
    
    const dataUltimo = new Date(ultimaData);
    const dataAtual = new Date();
    
    // Calcula a diferença em dias
    const diffTime = Math.abs(dataAtual - dataUltimo);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 7;
  };

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

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          setUserData(userData);

          if (!userData.planoAtivo) {
            return;
          }

          try {
            const q = query(
              collection(db, 'treinos'),
              where('userId', '==', auth.currentUser.uid)
            );
            
            const querySnapshot = await getDocs(q);
            const treinosData = [];
            
            for (const doc of querySnapshot.docs) {
              const data = doc.data();
              
              // Verifica se precisa resetar a semana
              if (isNovaSemana(data.ultimaAtualizacao)) {
                // Reset dos dias concluídos se for uma nova semana
                await updateDoc(doc.ref, {
                  diasConcluidos: [],
                  ultimaAtualizacao: new Date().toISOString()
                });
                data.diasConcluidos = [];
              }
              
              treinosData.push({
                id: doc.id,
                ...data,
                diasConcluidos: data.diasConcluidos || []
              });
            }
            
            const treinosOrdenados = treinosData.sort((a, b) => 
              b.dataCreated.toDate() - a.dataCreated.toDate()
            );
            setTreinos(treinosOrdenados);

            if (treinoSelecionado) {
              const treinoAtual = treinosOrdenados.find(t => t.id === treinoSelecionado.id);
              if (treinoAtual) {
                setDiasConcluidos(treinoAtual.diasConcluidos || []);
                setTreinoSelecionado({
                  ...treinoSelecionado,
                  diasConcluidos: treinoAtual.diasConcluidos || []
                });
              }
            }
          } catch (error) {
            Logger.error('Erro ao carregar treinos', error, {
              component: 'Treinos',
              action: 'loadWorkouts'
            });
            Alert.alert('Erro', 'Não foi possível carregar os treinos');
          }
        }
      },
      (error) => {
        Logger.error('Erro ao carregar dados do usuário', error, {
          component: 'Treinos',
          action: 'loadUserData'
        });
        Alert.alert('Erro', 'Não foi possível carregar seus dados');
      }
    );

    setIsLoading(false);

    return () => unsubscribeUser();
  }, []);

  useEffect(() => {
    if (treinoSelecionado) {
      const treinoAtual = treinos.find(t => t.id === treinoSelecionado.id);
      if (treinoAtual) {
        setDiasConcluidos(treinoAtual.diasConcluidos || []);
      }
    }
  }, [treinoSelecionado, treinos]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        gestureEnabled: false,
        headerLeft: null,
      });
    }, [])
  );

  const RenameInput = React.memo(({ treinoSelecionado, setIsRenaming, setTreinos }) => {
    const [inputValue, setInputValue] = useState(treinoSelecionado?.nomeTreino || '');

    const handleConfirm = async () => {
      if (!inputValue.trim()) {
        Alert.alert('Erro', 'O nome do treino não pode estar vazio');
        return;
      }

      try {
        const treinoRef = doc(db, 'treinos', treinoSelecionado.id);
        await updateDoc(treinoRef, {
          nomeTreino: inputValue.trim()
        });

        setTreinoSelecionado(prev => ({
          ...prev,
          nomeTreino: inputValue.trim()
        }));

        setTreinos(prevTreinos => 
          prevTreinos.map(treino => 
            treino.id === treinoSelecionado.id 
              ? { ...treino, nomeTreino: inputValue.trim() }
              : treino
          )
        );
        
        setIsRenaming(false);
        Alert.alert('Sucesso', 'Nome do treino atualizado com sucesso!');
      } catch (error) {
        Logger.error('Erro ao renomear treino', error, {
          component: 'Treinos',
          action: 'handleRename',
          workoutId: treinoSelecionado.id
        });
        Alert.alert('Erro', 'Não foi possível renomear o treino');
      }
    };

    return (
      <View style={styles.renameContainer}>
        <TextInput
          style={styles.renameInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Digite o novo nome"
          placeholderTextColor="#666"
          autoFocus={true}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <View style={styles.renameButtons}>
          <TouchableOpacity 
            style={[styles.renameButton, styles.confirmButton]}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.renameButton, styles.cancelButton]}
            onPress={() => {
              setIsRenaming(false);
              Keyboard.dismiss();
            }}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  });

  function iniciarTreino(treino) {
    setTreinoEmAndamento(true);
    setTreinoSelecionado(treino);
    setDiasConcluidos(treino.diasConcluidos || []);
    setDiaAtual(null);
    setExerciciosRestantes([]);
    setExerciciosConcluidos([]);
    setMostrarParabens(false);
    setTempoInicio(null);
  }

  function selecionarDia(dia) {
    setDiaAtual(dia);
    setExerciciosRestantes(treinoSelecionado.treinos[dia]);
    setContadorAtivo(true);
    setContadorInicio(5);
    
    const intervalId = setInterval(() => {
      setContadorInicio((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setContadorAtivo(false);
          setTempoInicio(new Date());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function concluirExercicio(exercicio, index) {
    const novosExerciciosRestantes = exerciciosRestantes.filter((_, i) => i !== index);
    setExerciciosRestantes(novosExerciciosRestantes);
    setExerciciosConcluidos(prev => [...prev, exercicio]);

    if (novosExerciciosRestantes.length === 0) {
      const tempoFinal = new Date();
      const diferenca = tempoFinal - tempoInicio;
      
      // Calcula horas, minutos e segundos
      const horas = Math.floor(diferenca / 3600000);
      const minutos = Math.floor((diferenca % 3600000) / 60000);
      const segundos = Math.floor((diferenca % 60000) / 1000);
      
      // Formata o texto do tempo total
      let tempoFormatado = '';
      if (horas > 0) {
        tempoFormatado += `${horas}h `;
      }
      if (minutos > 0 || horas > 0) {
        tempoFormatado += `${minutos}min `;
      }
      tempoFormatado += `${segundos}s`;
      
      setTempoTotal(tempoFormatado);
      setMostrarParabens(true);
    }
  }

  function finalizarTreino() {
    setTreinoEmAndamento(false);
    setDiaAtual(null);
    setExerciciosRestantes([]);
    setExerciciosConcluidos([]);
    setMostrarParabens(false);
    setTempoTotal(null);
  }

  const getPrimeiroNome = () => {
    if (!userData?.name) return '';
    return userData.name.split(' ')[0];
  };

  const renderProgresso = () => (
    <View style={styles.progressoContainer}>
      <View style={styles.progressoHeader}>
        <Text style={styles.progressoTitle}>
          Progresso: {exerciciosConcluidos.length}/{exerciciosConcluidos.length + exerciciosRestantes.length}
        </Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setShowAllConcluidos(!showAllConcluidos)}
        >
          <MaterialIcons 
            name={showAllConcluidos ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.exerciciosConcluidosContainer}>
        {exerciciosConcluidos.length > 0 && (
          <View style={styles.exercicioConcluido}>
            <MaterialIcons name="check-circle" size={20} color="#28a745" />
            <Text style={styles.exercicioConcluidoText}>
              {exerciciosConcluidos[0].tipo === 'combinado' 
                ? 'Combo: ' + exerciciosConcluidos[0].exercicios.map(ex => ex.nome).join(' + ')
                : exerciciosConcluidos[0].nome
              }
            </Text>
          </View>
        )}

        {showAllConcluidos && exerciciosConcluidos.slice(1).map((exercicio, index) => (
          <View 
            key={`concluido-${index + 1}`} 
            style={[
              styles.exercicioConcluido,
              styles.exercicioConcluidoIndentado
            ]}
          >
            <MaterialIcons name="check-circle" size={20} color="#28a745" />
            <Text style={styles.exercicioConcluidoText}>
              {exercicio.tipo === 'combinado' 
                ? 'Combo: ' + exercicio.exercicios.map(ex => ex.nome).join(' + ')
                : exercicio.nome
              }
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderHeader = () => (
    <View>
      <TouchableOpacity 
        style={styles.voltarButtonDia}
        onPress={() => {
          setTreinoSelecionado(null);
          setTreinoEmAndamento(false);
          setDiaAtual(null);
          setExerciciosConcluidos([]);
          setExerciciosRestantes([]);
        }}
      >
        <MaterialIcons name="arrow-back" size={24} color="#1a1a1a" />
        <Text style={styles.voltarTextDia}>Voltar</Text>
      </TouchableOpacity>

      {diaAtual && exerciciosConcluidos.length > 0 && renderProgresso()}
    </View>
  );

  const renderDiaSelection = () => {
    if (diaAtual && !contadorAtivo) return null;

    return (
      <View style={styles.diasContainer}>
        <Text style={styles.sectionTitle}>
          Selecione o dia do treino:
        </Text>
        <View style={styles.diasOptions}>
          {Object.keys(treinoSelecionado.treinos).map((dia) => (
            <TouchableOpacity
              key={dia}
              style={[
                styles.diaButton,
                diaAtual === dia && styles.diaButtonSelected
              ]}
              onPress={() => selecionarDia(dia)}
            >
              <View style={styles.diaButtonContent}>
                <MaterialIcons 
                  name="event" 
                  size={24} 
                  color={diaAtual === dia ? '#FFF' : '#666'} 
                />
                <Text style={[
                  styles.diaButtonText,
                  diaAtual === dia && styles.diaButtonTextSelected
                ]}>
                  Dia {dia}
                </Text>
                {diasConcluidos.includes(dia) && (
                  <MaterialIcons 
                    name="check-circle" 
                    size={20} 
                    color={diaAtual === dia ? '#FFF' : '#4CAF50'} 
                    style={styles.checkIcon}
                  />
                )}
              </View>
              <Text style={[
                styles.exerciciosCount,
                diaAtual === dia && styles.exerciciosCountSelected
              ]}>
                {treinoSelecionado.treinos[dia].length} exercícios
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderContador = () => {
    if (!contadorAtivo) return null;

    return (
      <View style={styles.contadorOverlay}>
        <View style={styles.contadorContainer}>
          <Text style={styles.contadorText}>
            Treino iniciando em {contadorInicio}...
          </Text>
        </View>
      </View>
    );
  };

  const renderExerciciosList = () => {
    if (!diaAtual || !treinoSelecionado.treinos[diaAtual]) return null;

    return (
      <View style={styles.exerciciosContainer}>
        {!mostrarParabens ? (
          exerciciosRestantes.map((exercicio, index) => (
            <View key={`exercicio-${index}`} style={styles.exercicioCard}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => concluirExercicio(exercicio, index)}
              >
                <MaterialIcons 
                  name="check-box-outline-blank" 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>

              {exercicio.tipo === 'combinado' ? (
                <View style={styles.exercicioCombinadoContainer}>
                  <Text style={styles.combinadoTitle}>Exercícios Combinados</Text>
                  {exercicio.exercicios.map((ex, idx) => (
                    <View key={`combinado-${index}-${idx}`} style={styles.exercicioCombinadoItem}>
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
                <View style={styles.exercicioContentWrapper}>
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
              )}
            </View>
          ))
        ) : (
          <View style={styles.parabensContainer}>
            <Text style={styles.parabensTitle}>
              Parabéns {getPrimeiroNome()}!
            </Text>
            <View style={styles.parabensIconsContainer}>
              <Text style={styles.parabensText}>
                Seu treino de hoje foi finalizado com sucesso
              </Text>
              <View style={styles.iconsRow}>
                <MaterialIcons name="fitness-center" size={24} color="#28a745" />
                <MaterialIcons name="favorite" size={24} color="#FF4444" />
              </View>
            </View>
            <View style={styles.tempoContainer}>
              <Text style={styles.tempoText}>
                O tempo que você levou foi {tempoTotal}
              </Text>
              <MaterialIcons name="timer" size={24} color="#1a1a1a" />
            </View>
            <TouchableOpacity 
              style={styles.voltarButtonParabens}
              onPress={async () => {
                if (diaAtual !== null) {
                  const novosDiasConcluidos = [...diasConcluidos, diaAtual];
                  
                  const totalDias = Object.keys(treinoSelecionado.treinos).length;
                  
                  if (novosDiasConcluidos.length === totalDias) {
                    await salvarDiasConcluidos(treinoSelecionado, []);
                    Alert.alert('Parabéns!', 'Você completou todos os dias do treino!');
                  } else {
                    await salvarDiasConcluidos(treinoSelecionado, novosDiasConcluidos);
                  }
                }
                
                setTreinoEmAndamento(false);
                setTreinoSelecionado(null);
                setMostrarParabens(false);
                setDiaAtual(null);
                setExerciciosConcluidos([]);
                setExerciciosRestantes([]);
              }}
            >
              <MaterialIcons name="check-circle" size={24} color="#FFF" />
              <Text style={styles.voltarTextParabens}>Concluir e Voltar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const atualizarNomeTreino = async (treino, novoNome) => {
    try {
      const treinoRef = doc(db, 'treinos', treino.id);
      await updateDoc(treinoRef, {
        nomeTreino: novoNome.trim()
      });

      setTreinos(prevTreinos => 
        prevTreinos.map(t => 
          t.id === treino.id 
            ? { ...t, nomeTreino: novoNome.trim() }
            : t
        )
      );

      setTreinoEditando(null);
      Alert.alert('Sucesso', 'Nome do treino atualizado com sucesso!');
    } catch (error) {
      Logger.error('Erro ao renomear treino', error, {
        component: 'Treinos',
        action: 'handleRename',
        workoutId: treino.id
      });
      Alert.alert('Erro', 'Não foi possível renomear o treino');
    }
  };

  const salvarDiasConcluidos = async (treino, novosDiasConcluidos) => {
    try {
      // Atualiza o estado local primeiro
      setDiasConcluidos(novosDiasConcluidos);
      
      // Atualiza o treinoSelecionado
      const treinoAtualizado = {
        ...treino,
        diasConcluidos: novosDiasConcluidos
      };
      setTreinoSelecionado(treinoAtualizado);
      
      // Atualiza os treinos locais
      setTreinos(prevTreinos => 
        prevTreinos.map(t => 
          t.id === treino.id 
            ? treinoAtualizado
            : t
        )
      );

      // Depois salva no Firestore
      const treinoRef = doc(db, 'treinos', treino.id);
      await updateDoc(treinoRef, {
        diasConcluidos: novosDiasConcluidos,
        ultimaAtualizacao: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Erro ao salvar dias concluídos', error, {
        component: 'Treinos',
        action: 'handleDayCompletion',
        workoutId: treino.id,
        dayNumber: diaAtual
      });
      console.error('Erro ao salvar dias concluídos:', error);
      Alert.alert('Erro', 'Não foi possível salvar o progresso do treino');
    }
  };

  const handleBlockedUser = () => {
    Alert.alert(
      'Acesso Bloqueado',
      'Seu acesso está bloqueado. Entre em contato com o administrador.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              })
            );
          }
        }
      ]
    );
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        })
      );
    } catch (error) {
      Logger.error('Erro ao fazer logout', error, {
        component: 'Treinos',
        action: 'handleLogout'
      });
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout');
    }
  }, [navigation]);

  const treinosOrdenados = useMemo(() => 
    treinos.sort((a, b) => b.dataCreated.toDate() - a.dataCreated.toDate()),
    [treinos]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!userData?.planoAtivo) {
    return (
      <View style={styles.containerBloqueado}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleLogout}
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Treinos</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {!treinoSelecionado ? (
        <FlatList
          data={treinosOrdenados}
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          initialNumToRender={10}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <View style={styles.treinoCard}>
              <View style={styles.treinoInfo}>
                <View style={styles.treinoTitleContainer}>
                  {treinoEditando === item.id ? (
                    <TextInput
                      style={styles.treinoTitleInput}
                      defaultValue={item.nomeTreino || ''}
                      placeholder="Digite o nome do treino"
                      placeholderTextColor="#666"
                      onSubmitEditing={(e) => {
                        const novoNome = e.nativeEvent.text.trim();
                        if (novoNome) {
                          atualizarNomeTreino(item, novoNome);
                        } else {
                          setTreinoEditando(null);
                        }
                      }}
                      onBlur={() => setTreinoEditando(null)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <Text style={styles.treinoTitle}>
                        {item.nomeTreino ? `Treino: ${item.nomeTreino}` : 'Treino'}
                      </Text>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => setTreinoEditando(item.id)}
                      >
                        <MaterialIcons name="edit" size={20} color="#0000ff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <Text style={styles.treinoDate}>
                  Criado: {item.dataCreated?.toDate().toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.treinoSubtitle}>
                  Frequencia: {item.frequenciaTreino} dias por semana
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => iniciarTreino(item)}
              >
                <MaterialIcons name="play-circle-filled" size={46} color="#28a745" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum treino encontrado</Text>
          }
        />
      ) : (
        <>
          <ScrollView 
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderHeader()}
            {renderDiaSelection()}
            {!contadorAtivo && renderExerciciosList()}
          </ScrollView>
          {renderContador()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerBloqueado: {
    flex: 1,
    backgroundColor: '#1c1c1c', // Fundo escuro para acesso bloqueado
  },
  content: {
    padding: 20,
    alignItems: 'center',
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
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  treinoCard: {
    backgroundColor: '#FFF',
    margin: 10,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '95%',
    alignSelf: 'center',
  },
  treinoInfo: {
    flex: 1,
  },
  treinoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  treinoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  treinoTitleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#666',
    minWidth: '80%',
  },
  treinoDate: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  treinoSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  playButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameContainer: {
    padding: 10,
  },
  renameInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  renameButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    margin: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FF4444',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diasContainer: {
    margin: 10,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  diasOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  diaButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    width: '47%',
    alignItems: 'center',
    elevation: 2,
    justifyContent: 'center',
    marginBottom: 10,
  },
  diaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
    width: '100%',
  },
  diaButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    textAlignVertical: 'center',
  },
  diaButtonSelected: {
    backgroundColor: '#28a745',
  },
  diaButtonTextSelected: {
    color: '#FFF',
  },
  exerciciosContainer: {
    paddingBottom: 100,
  },
  exercicioCard: {
    backgroundColor: '#FFF',
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exercicioContentWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exercicioContent: {
    flex: 1,
    marginRight: 10,
  },
  grupamentoText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  exercicioNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginVertical: 8,
  },
  exercicioDetalhes: {
    fontSize: 16,
    color: '#666',
  },
  observacaoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#FF4444',
    paddingLeft: 10,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  videoButton: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButton: {
    padding: 8,
  },
  parabensContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    margin: 10,
  },
  parabensTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  parabensIconsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  parabensText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  tempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  tempoText: {
    fontSize: 16,
    color: '#666',
  },
  voltarButtonParabens: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  voltarTextParabens: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  slideAnim: {
    transform: [{ translateY: 0 }],
  },
  exerciciosCount: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  exerciciosCountSelected: {
    color: '#FFF',
  },
  checkboxContainer: {
    marginRight: 10,
    padding: 5,
  },
  exercicioCombinadoContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  combinadoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 10,
  },
  exercicioCombinadoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  voltarButtonDia: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignSelf: 'flex-start',
    elevation: 2,
  },
  voltarTextDia: {
    color: '#1a1a1a',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contadorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  contadorContainer: {
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  contadorText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    marginHorizontal: 10,
  },
  progressoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dropdownButton: {
    padding: 8,
    marginRight: -5,
  },
  exerciciosConcluidosContainer: {
    marginTop: 10,
  },
  exercicioConcluido: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  exercicioConcluidoIndentado: {
    paddingLeft: 25,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exercicioConcluidoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  checkIcon: {
    marginLeft: 4,
    alignSelf: 'center',
  },
  logoutButton: {
    padding: 8,
  },
}); 