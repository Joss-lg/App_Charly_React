// src/lib/notificacionesSeguras.js
// Carga "expo-notifications" SOLO donde se puede usar.
//
// En Expo Go para ANDROID (desde el SDK 55), con solo importar expo-notifications
// la app truena con la pantalla roja. Aquí lo evitamos:
// - iPhone (Expo Go o app final): se carga normal.
// - Android en la app final (build con EAS): se carga normal.
// - Android en Expo Go: NO se carga; la app funciona igual, solo sin notificaciones.

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let modulo = null;
if (!(Platform.OS === 'android' && esExpoGo)) {
  try {
    modulo = require('expo-notifications');
  } catch (e) {
    modulo = null;
  }
}

// Es null cuando no hay notificaciones disponibles
export const Notifications = modulo;
export const hayNotificaciones = !!modulo;