import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ProductoDetalleScreen from '../screens/ProductoDetalleScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="ProductoDetalle"
        component={ProductoDetalleScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}