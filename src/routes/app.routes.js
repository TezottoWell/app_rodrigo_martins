import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';

import Home from '../pages/home';
import Treinos from '../pages/treinos';
import Financeiro from '../pages/financeiro';

const Tab = createBottomTabNavigator();

export function AppRoutes(){
  return(
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle:{
          backgroundColor: '#1a1a1a',
          borderTopWidth: 0,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: '#FFF',
        tabBarInactiveTintColor: '#8F8F8F',
        gestureEnabled: false,
        headerLeft: () => null,
      }}
      backBehavior="none"
    >
      <Tab.Screen 
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen 
        name="Treinos"
        component={Treinos}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="fitness-center" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen 
        name="Financeiro"
        component={Financeiro}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="attach-money" size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  )
} 