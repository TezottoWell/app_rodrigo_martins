import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function TermsOfUse({ visible, onAccept, onClose }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Termos de Uso</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.termsContainer}>
            <Text style={styles.termsText}>
              1. Aceitação dos Termos{'\n\n'}
              Ao acessar e usar este aplicativo, você concorda em cumprir estes Termos de Uso.{'\n\n'}

              2. Uso do Aplicativo{'\n\n'}
              - O aplicativo deve ser usado apenas para fins de acompanhamento fitness.{'\n'}
              - Você é responsável por manter a confidencialidade de sua conta.{'\n'}
              - Você concorda em não usar o aplicativo para fins ilegais.{'\n\n'}

              3. Privacidade{'\n\n'}
              - Coletamos apenas os dados necessários para o funcionamento do app.{'\n'}
              - Seus dados pessoais são protegidos e não são compartilhados.{'\n\n'}

              4. Responsabilidades{'\n\n'}
              - Consulte um profissional de saúde antes de iniciar qualquer programa de exercícios.{'\n'}
              - Não nos responsabilizamos por lesões durante os exercícios.{'\n\n'}

              5. Pagamento{'\n\n'}
              - O pagamento é feito mensalmente atravez de contato com o Rodrigo Martins.{'\n'}
              - O valor do plano é de R$ 300,00.{'\n'}
              - Acesse o link de contato no aplicativo na aba de financeiro.{'\n\n'}

              6. Alterações nos Termos{'\n\n'}
              Podemos atualizar estes termos a qualquer momento. Alterações significativas serão notificadas.
            </Text>
          </ScrollView>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setIsChecked(!isChecked)}
            >
              <MaterialIcons 
                name={isChecked ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color="#1a1a1a" 
              />
              <Text style={styles.checkboxText}>
                Li e concordo com os termos de uso
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.acceptButton, !isChecked && styles.acceptButtonDisabled]}
            onPress={onAccept}
            disabled={!isChecked}
          >
            <Text style={[styles.acceptButtonText, !isChecked && styles.acceptButtonTextDisabled]}>
              Continuar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 5,
  },
  termsContainer: {
    maxHeight: '70%',
  },
  termsText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  checkboxContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  acceptButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#ccc',
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButtonTextDisabled: {
    color: '#666',
  },
}); 