import { createStackNavigator } from '@react-navigation/stack';

// Importações necessárias
import SignIn from '../pages/signin';
import Admin from '../pages/admin';
import CreateWorkout from '../pages/admin/CreateWorkout';
import EditWorkout from '../pages/admin/EditWorkout';
import TreinoModelo from '../pages/admin/TreinoModelo';
import ManageUsers from '../pages/admin/ManageUsers';

const Stack = createStackNavigator();

export function AuthRoutes(){
  return(
    <Stack.Navigator>
      <Stack.Screen 
        name="SignIn" 
        component={SignIn}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="Admin" 
        component={Admin}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="CreateWorkout" 
        component={CreateWorkout}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="EditWorkout" 
        component={EditWorkout}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="ManageUsers" 
        component={ManageUsers}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="TreinoModelo" 
        component={TreinoModelo}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  )
} 