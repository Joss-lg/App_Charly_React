import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNotificaciones } from '../context/NotificacionesContext';
import { useDatos } from '../context/DatosContext';
import TabBarPizzetos from '../components/TabBarPizzetos';
import HomeScreen from '../screens/HomeScreen';
import PromocionesScreen from '../screens/PromocionesScreen';
import SucursalesScreen from '../screens/SucursalesScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { noLeidas } = useNotificaciones();
  const { promociones } = useDatos();

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBarPizzetos {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen
        name="Promos"
        component={PromocionesScreen}
        options={{
          tabBarBadge: promociones.length > 0 ? String(promociones.length) : undefined,
        }}
      />
      <Tab.Screen name="Sucursales" component={SucursalesScreen} />
      <Tab.Screen
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{
          tabBarBadge: noLeidas > 0 ? String(noLeidas) : undefined,
        }}
      />
    </Tab.Navigator>
  );
}