// src/lib/recordatorios.js
// Notificaciones diarias de la pizzería (notificaciones LOCALES programadas).
//
// Cómo funciona:
// - Cada vez que se abre la app, se programan las notificaciones de los
//   próximos días (2 por día, en los horarios de abajo).
// - El celular las muestra a su hora AUNQUE LA APP ESTÉ CERRADA.
// - Los textos se arman con productos reales de Supabase (nombre, descripción y precio).
// - Cada notificación que ya sonó se guarda para mostrarla en la pestaña "Avisos".
// - No necesita servidor y funciona en Expo Go.
// - El nombre y colores vienen de src/config/marca.js.

import { Platform } from 'react-native';
import { Notifications } from './notificacionesSeguras';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { esPaqueteDePromos } from '../data/paquetes';
import { MARCA, COLORES } from '../config/marca';

// ---------- Ajustes (puedes cambiarlos) ----------
// Para una sola notificación al día, deja solo un horario.
// Procura que caigan dentro del horario en que abren las sucursales.
// Cada horario tiene varios títulos que se van turnando día con día.
export const HORARIOS = [
  {
    hora: 13,
    minuto: 30,
    titulos: [
      '¿Ya pensaste qué vas a comer?',
      'La pizza de tu vida te espera',
      'Hoy la comida se resuelve sola',
      'Ese antojo tiene solución',
      'Hora de la comida',
    ],
  },
  {
    hora: 19,
    minuto: 0,
    titulos: [
      '¿Pizza para cenar?',
      'Noche de pizza',
      'La cena ya está resuelta',
      'Se te antojó algo rico, ¿verdad?',
      'Plan perfecto para esta noche',
    ],
  },
];

// Emojis dentro del texto de la notificación (no se usan como íconos de la app).
// Si no los quieres, cambia a false.
const USAR_EMOJIS = true;
const EMOJI = { Paquetes: '🍕', Pizzas: '🍕', Snacks: '🍟' };

// Nombre que aparece arriba del mensaje en iPhone
const NOMBRE_MARCA = MARCA.nombre;
const DIAS_A_PROGRAMAR = 10; // días hacia adelante que quedan programados
const DIAS_EN_AVISOS = 7; // cuántos días atrás se guardan en el historial

const CLAVE_LISTA = `${MARCA.prefijoGuardado}:recordatorios:lista`;
const CANAL_ANDROID = 'avisos';

let programando = false;

// Cómo se comporta la notificación si llega con la app abierta
export function configurarNotificaciones() {
  if (!Notifications) return; // Android en Expo Go
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Pide permiso para mandar notificaciones (solo pregunta una vez)
export async function pedirPermiso() {
  if (!Notifications) return false; // Android en Expo Go
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
        name: `Avisos de ${NOMBRE_MARCA}`,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: COLORES.primario,
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const nuevo = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return nuevo.granted;
  } catch (e) {
    return false;
  }
}

function formatoPrecio(valor) {
  const n = Number(valor);
  if (isNaN(n)) return '';
  return '$' + n.toFixed(Number.isInteger(n) ? 0 : 2);
}

// Evita que diga "pizza Pizza":
// "Pepperoni"       → "pizza Pepperoni"
// "Pizza Hawaiana"  → "Pizza Hawaiana" (ya trae la palabra, no se repite)
function nombreDePizza(nombre) {
  const limpio = String(nombre || '').trim();
  return /^pizza\b/i.test(limpio) ? limpio : `pizza ${limpio}`;
}

// Arma los mensajes posibles SOLO con productos reales
function armarCandidatos(productos) {
  // Paquetes: los de la categoría "Paquetes" y los marcados con "solo_promos"
  const paquetes = productos.filter(
    (p) => p.categoria === 'Paquetes' || esPaqueteDePromos(p)
  );
  const pizzas = productos.filter((p) => p.categoria === 'Pizzas' && !esPaqueteDePromos(p));
  const snacks = productos.filter((p) => p.categoria === 'Snacks' && !esPaqueteDePromos(p));

  const emoji = (cat) => (USAR_EMOJIS && EMOJI[cat] ? ` ${EMOJI[cat]}` : '');

  // Textos cortos para que se lean completos en la pantalla de bloqueo
  const dePaquete = (p) => ({
    mensaje: `${p.nombre}: ${p.descripcion} por ${formatoPrecio(p.precio)}${emoji('Paquetes')} Toca para verlo.`,
    productoId: p.id,
    destino: esPaqueteDePromos(p)
      ? { pantalla: 'Promos' }
      : { pantalla: 'ProductoDetalle', id: p.id },
  });
  const dePizza = (p) => ({
    mensaje: `Una ${nombreDePizza(p.nombre)} bien calientita, ${p.precioDesde ? 'desde ' : 'por '}${formatoPrecio(p.precio)}${emoji('Pizzas')} Toca para verla.`,
    productoId: p.id,
    destino: { pantalla: 'ProductoDetalle', id: p.id },
  });
  const deSnack = (p) => ({
    mensaje: `Acompaña tu pizza con ${p.nombre} por ${formatoPrecio(p.precio)}${emoji('Snacks')} Toca para verlo.`,
    productoId: p.id,
    destino: { pantalla: 'ProductoDetalle', id: p.id },
  });

  // Se intercalan: paquete, pizza, snack, paquete, pizza...
  const grupos = [paquetes.map(dePaquete), pizzas.map(dePizza), snacks.map(deSnack)];
  const lista = [];
  const mayor = Math.max(...grupos.map((g) => g.length), 0);
  for (let i = 0; i < mayor; i++) {
    grupos.forEach((g) => {
      if (g[i]) lista.push(g[i]);
    });
  }
  return lista;
}

function dosDigitos(n) {
  return String(n).padStart(2, '0');
}

function claveDia(fecha) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

// Número de día desde 1970 (para que cada día toque un mensaje distinto)
function numeroDeDia(fecha) {
  return Math.floor(
    Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 86400000
  );
}

async function leerLista() {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_LISTA);
    const lista = texto ? JSON.parse(texto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

// Programa las notificaciones de los próximos días.
// Se llama cada vez que se abre la app (ya con los productos cargados).
export async function programarRecordatorios(productos) {
  if (!Notifications) return; // Android en Expo Go
  if (programando || !productos || productos.length === 0) return;
  programando = true;
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return;

    const candidatos = armarCandidatos(productos);
    if (candidatos.length === 0) return;

    const ahora = Date.now();
    const limiteHistorial = ahora - DIAS_EN_AVISOS * 86400000;

    // Las que ya sonaron se quedan (para Avisos); las futuras se rehacen
    const anteriores = await leerLista();
    const pasadas = anteriores.filter(
      (r) => r.fechaMs <= ahora && r.fechaMs >= limiteHistorial
    );

    await Notifications.cancelAllScheduledNotificationsAsync();

    const nuevas = [];
    const hoy = new Date();
    for (let d = 0; d < DIAS_A_PROGRAMAR; d++) {
      const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
      HORARIOS.forEach((h, slot) => {
        const fecha = new Date(
          dia.getFullYear(), dia.getMonth(), dia.getDate(), h.hora, h.minuto, 0
        );
        if (fecha.getTime() <= ahora + 60000) return; // ya pasó o está por pasar

        const numDia = numeroDeDia(fecha);
        const indice = (numDia * HORARIOS.length + slot) % candidatos.length;
        const elegido = candidatos[indice];
        const titulos = h.titulos && h.titulos.length ? h.titulos : [NOMBRE_MARCA];
        nuevas.push({
          // El id lleva día y hora, así nunca se repite aunque cambies los horarios
          id: `rec-${claveDia(fecha)}-${dosDigitos(h.hora)}${dosDigitos(h.minuto)}`,
          titulo: titulos[numDia % titulos.length],
          mensaje: elegido.mensaje,
          destino: elegido.destino,
          productoId: elegido.productoId,
          fechaMs: fecha.getTime(),
        });
      });
    }

    for (const r of nuevas) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: r.titulo,
          subtitle: NOMBRE_MARCA, // en iPhone sale entre el título y el mensaje
          body: r.mensaje,
          sound: true,
          data: { avisoId: r.id, destino: r.destino },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(r.fechaMs),
          channelId: CANAL_ANDROID,
        },
      });
    }

    const idsNuevas = new Set(nuevas.map((r) => r.id));
    const pasadasSinRepetir = pasadas.filter((r) => !idsNuevas.has(r.id));
    await AsyncStorage.setItem(
      CLAVE_LISTA,
      JSON.stringify([...pasadasSinRepetir, ...nuevas])
    );
  } catch (e) {
    console.log('No se pudieron programar las notificaciones:', e?.message);
  } finally {
    programando = false;
  }
}

// Notificaciones que YA sonaron, con la misma forma que los avisos de Supabase.
// Las más nuevas primero.
export async function obtenerRecordatoriosPasados() {
  // 5 segundos de margen por si el celular la muestra un instante antes
  const ahora = Date.now() + 5000;
  const limite = ahora - DIAS_EN_AVISOS * 86400000;
  const lista = await leerLista();

  // Quita repetidas (por si quedaron de pruebas anteriores)
  const unicas = new Map();
  lista.forEach((r) => unicas.set(r.id, r));

  return Array.from(unicas.values())
    .filter((r) => r.fechaMs <= ahora && r.fechaMs >= limite)
    .sort((a, b) => b.fechaMs - a.fechaMs)
    .map((r) => ({
      id: r.id,
      tipo: 'recordatorio',
      titulo: r.titulo,
      mensaje: r.mensaje,
      destino: r.destino,
      productoId: r.productoId ?? r.destino?.id ?? null,
      fecha: new Date(r.fechaMs).toISOString(),
    }));
}

// La siguiente notificación programada (para mostrar "Próximo aviso" en Avisos)
export async function obtenerProximoRecordatorio() {
  const ahora = Date.now();
  const lista = await leerLista();
  const futuras = lista
    .filter((r) => r.fechaMs > ahora)
    .sort((a, b) => a.fechaMs - b.fechaMs);
  return futuras[0] || null;
}

// ¿El usuario dio permiso de notificaciones?
// Regresa 'si', 'no' o 'no-disponible' (Android en Expo Go)
export async function estadoPermiso() {
  if (!Notifications) return 'no-disponible';
  try {
    const permiso = await Notifications.getPermissionsAsync();
    return permiso.granted ? 'si' : 'no';
  } catch {
    return 'no';
  }
}