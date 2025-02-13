import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Welcome from '../pages/welcome';
import SignIn from '../pages/signin';
import SignUp from '../pages/signup';
import Admin from '../pages/admin';
import ManageUsers from '../pages/manageUsers';
import CreateWorkout from '../pages/admin/CreateWorkout';
import EditWorkout from '../pages/admin/EditWorkout';
import { AppRoutes } from './app.routes';
import ImageViewer from '../pages/ImageViewer';

const Stack = createNativeStackNavigator();

export default function Routes() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: false, // Desabilita gestos de navegação
            }}
        >
            <Stack.Group>
                <Stack.Screen name="Welcome" component={Welcome} />
                <Stack.Screen name="SignIn" component={SignIn} />
                <Stack.Screen name="SignUp" component={SignUp} />
            </Stack.Group>

            <Stack.Group screenOptions={{ gestureEnabled: false }}>
                <Stack.Screen 
                    name="MainApp" 
                    component={AppRoutes}
                    options={{
                        gestureEnabled: false,
                    }}
                />
                <Stack.Screen name="Admin" component={Admin} />
                <Stack.Screen name="ManageUsers" component={ManageUsers} />
                <Stack.Screen name="CreateWorkout" component={CreateWorkout} />
                <Stack.Screen name="EditWorkout" component={EditWorkout} />
                <Stack.Screen name="ImageViewer" component={ImageViewer} />
            </Stack.Group>
        </Stack.Navigator>
    );
}
