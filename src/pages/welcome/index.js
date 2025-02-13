import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TermsOfUse from '../../components/TermsOfUse';
import Logger from '../../utils/logger';

export default function Welcome() {
    const navigation = useNavigation();
    const [showTerms, setShowTerms] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        checkTermsAccepted();
    }, []);

    const checkTermsAccepted = async () => {
        try {
            const hasAccepted = await AsyncStorage.getItem('@terms_accepted');
            setTermsAccepted(hasAccepted === 'true');
        } catch (error) {
            Logger.warn('Erro ao verificar termos aceitos', {
                component: 'Welcome',
                action: 'checkTermsAccepted'
            });
        }
    };

    const handleAcceptTerms = async () => {
        try {
            await AsyncStorage.setItem('@terms_accepted', 'true');
            setTermsAccepted(true);
            setShowTerms(false);
            navigation.navigate('SignIn');
        } catch (error) {
            Logger.warn('Erro ao salvar termos aceitos', {
                component: 'Welcome',
                action: 'saveTermsAccepted'
            });
        }
    };

    const handleAccessPress = () => {
        if (termsAccepted) {
            navigation.navigate('SignIn');
        } else {
            setShowTerms(true);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.logo}>
                <Animatable.Image animation='fadeInDownBig' source={require('../../../assets/logo.png')} style={{ width: '100%' }} resizeMode='contain' />
            </View>
            <Animatable.View animation="fadeInUpBig" style={styles.title}>
                <Text style={styles.subtitleText}>Seus treinos de academia na palma da sua mão!</Text>
                <Text style={styles.descriptionText}>Faça seu login para continuar</Text>
                <Animatable.View
                    animation="pulse"
                    iterationCount="infinite"
                    style={styles.buttonContainer}
                >
                    <TouchableOpacity 
                        style={styles.button}
                        onPress={handleAccessPress}
                    >
                        <Text style={styles.buttonText}>Acessar</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </Animatable.View>
            <TermsOfUse 
                visible={showTerms}
                onAccept={handleAcceptTerms}
                onClose={() => setShowTerms(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    logo: {
        flex: 2,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        height: '35%',

    },
    title: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingStart: '5%',
        paddingEnd: '5%',
    },
    subtitleText: {
        marginTop: '5%',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    descriptionText: {
        color: '#1a1a1a',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#FFD700',
        borderRadius: 50,
        paddingVertical: 8,
        width: '75 %',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 18,
        color: '#FFF',
        fontWeight: 'bold',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: '25%',
        left: '5%',
        width: '100%',
        alignItems: 'center',
    },
});