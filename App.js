// App.js
// - Mantiene el splash (logo de Pizzeto's) hasta que las fuentes Poppins están listas
//   y la primera pantalla ya se dibujó; luego lo quita (con desvanecido en la app instalada).
// - Al tocar una notificación, abre la pantalla de su destino (también con la app cerrada).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Notifications } from './src/lib/notificacionesSeguras';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider, useTema } from './src/context/ThemeContext';
import { DatosProvider } from './src/context/DatosContext';
import {
  NotificacionesProvider, useNotificaciones, irADestino,
} from './src/context/NotificacionesContext';
import { FavoritosProvider } from './src/context/FavoritosContext';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarNotificaciones } from './src/lib/recordatorios';

// ¿La app corre dentro de Expo Go? (ahí no se puede personalizar el splash)
const ES_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// El splash NO se quita solo: lo quitamos nosotros cuando todo esté listo
SplashScreen.preventAutoHideAsync().catch(() => {});

// Desvanecido suave al quitar el splash (solo en la app instalada, no en Expo Go)
if (!ES_EXPO_GO) {
  try {
    SplashScreen.setOptions({ duration: 400, fade: true });
  } catch {
    // versiones que no lo soportan: se quita sin desvanecido
  }
}

// Si las fuentes tardan más que esto, la app abre de todos modos
const ESPERA_MAXIMA_FUENTES = 4000;

// Cómo se muestran las notificaciones si llegan con la app abierta
configurarNotificaciones();

// Permite navegar desde fuera de las pantallas (al tocar una notificación)
const navegacionRef = createNavigationContainerRef();
const CLAVE_ULTIMA_ATENDIDA = 'notif:ultimaAtendida';

function Root() {
  const { tema, modoOscuro } = useTema();
  const { marcarLeida, refrescarRecordatorios } = useNotificaciones();

  const destinoPendiente = useRef(null);
  const ultimaClave = useRef(null);
  const splashQuitado = useRef(false);

  const [fontsLoaded, errorFuentes] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Seguro: si las fuentes no cargan a tiempo, se sigue con la letra del teléfono
  const [tiempoAgotado, setTiempoAgotado] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTiempoAgotado(true), ESPERA_MAXIMA_FUENTES);
    return () => clearTimeout(t);
  }, []);

  const listo = fontsLoaded || Boolean(errorFuentes) || tiempoAgotado;

  // Quita el splash cuando la primera pantalla ya está dibujada (sin parpadeos)
  const alDibujar = useCallback(() => {
    if (!listo || splashQuitado.current) return;
    splashQuitado.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  // Qué hacer al tocar una notificación
  const atender = (respuesta) => {
    const data = respuesta?.notification?.request?.content?.data || {};
    if (data.avisoId) marcarLeida(data.avisoId);
    refrescarRecordatorios();
    if (!data.destino) return;
    if (navegacionRef.isReady()) {
      irADestino(navegacionRef, data.destino);
    } else {
      // La app se está abriendo: se navega en cuanto esté lista
      destinoPendiente.current = data.destino;
    }
  };
  const atenderRef = useRef(atender);
  atenderRef.current = atender;

  useEffect(() => {
    if (!Notifications) return undefined; // Android en Expo Go: sin notificaciones
    let activo = true;

    // Evita atender dos veces la misma notificación
    const manejar = async (respuesta, revisarGuardada) => {
      if (!respuesta) return;
      const clave = `${respuesta.notification.request.identifier}-${respuesta.notification.date}`;
      if (revisarGuardada) {
        const guardada = await AsyncStorage.getItem(CLAVE_ULTIMA_ATENDIDA).catch(() => null);
        if (guardada === clave) return;
      }
      if (!activo || ultimaClave.current === clave) return;
      ultimaClave.current = clave;
      AsyncStorage.setItem(CLAVE_ULTIMA_ATENDIDA, clave).catch(() => {});
      atenderRef.current(respuesta);
    };

    // La app estaba cerrada y se abrió tocando una notificación
    Notifications.getLastNotificationResponseAsync()
      .then((r) => manejar(r, true))
      .catch(() => {});

    // La app estaba abierta o en segundo plano
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      manejar(r, false);
    });

    return () => {
      activo = false;
      sub.remove();
    };
  }, []);

  const alEstarLista = () => {
    if (destinoPendiente.current) {
      irADestino(navegacionRef, destinoPendiente.current);
      destinoPendiente.current = null;
    }
  };

  const temaNavegacion = {
    ...(modoOscuro ? DarkTheme : DefaultTheme),
    colors: {
      ...(modoOscuro ? DarkTheme.colors : DefaultTheme.colors),
      background: tema.fondo,
      card: tema.header,
      text: tema.texto,
      primary: '#F5A623',
    },
  };

  // Mientras tanto no se dibuja nada: el splash con el logo sigue en pantalla
  if (!listo) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tema.fondo }} onLayout={alDibujar}>
      <StatusBar style={tema.statusBar} />
      <NavigationContainer ref={navegacionRef} theme={temaNavegacion} onReady={alEstarLista}>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DatosProvider>
          <NotificacionesProvider>
            <FavoritosProvider>
              <Root />
            </FavoritosProvider>
          </NotificacionesProvider>
        </DatosProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}