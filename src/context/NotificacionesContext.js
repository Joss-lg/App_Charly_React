// src/context/NotificacionesContext.js
// Junta en una sola lista:
//  1) Los avisos escritos a mano en Supabase (tabla "notificaciones").
//  2) Las notificaciones diarias que ya sonaron en el celular (src/lib/recordatorios.js).
// Guarda cuáles ya se leyeron y programa las notificaciones diarias.
// En la pestaña Avisos solo se muestran los de las últimas 24 horas;
// los más viejos se quitan solos (las notificaciones del teléfono no cambian).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notifications } from '../lib/notificacionesSeguras';
import { useDatos } from './DatosContext';
import { MARCA } from '../config/marca';
import {
  pedirPermiso,
  programarRecordatorios,
  obtenerRecordatoriosPasados,
} from '../lib/recordatorios';

const NotificacionesContext = createContext();
const CLAVE_LEIDAS = `${MARCA.prefijoGuardado}:notificacionesLeidas`;

// ---------- Ajuste (puedes cambiarlo) ----------
// Cuántas horas se queda un aviso en la pestaña Avisos
const HORAS_VISIBLE = 24;
const TIEMPO_VISIBLE_MS = HORAS_VISIBLE * 60 * 60 * 1000;

// Cada cuánto se revisa si ya venció algún aviso (1 minuto)
const REVISAR_CADA_MS = 60 * 1000;

// ¿El aviso sigue dentro de las últimas 24 horas?
// Si no tiene fecha, se deja visible (no sabemos cuánto tiempo lleva).
function sigueVigente(aviso, ahora) {
  if (!aviso.fecha) return true;
  const fecha = new Date(aviso.fecha).getTime();
  if (isNaN(fecha)) return true;
  return ahora - fecha < TIEMPO_VISIBLE_MS;
}

// Lleva a la pantalla correcta según el destino del aviso.
// Acepta el texto de Supabase ('Promos', 'Sucursales', 'Inicio')
// o el objeto de las notificaciones diarias ({ pantalla, id }).
export function irADestino(navegador, destino) {
  if (!navegador || !destino) return;
  if (typeof destino === 'string') {
    navegador.navigate(destino);
    return;
  }
  if (destino.pantalla === 'ProductoDetalle' && destino.id != null) {
    navegador.navigate('ProductoDetalle', { id: destino.id });
    return;
  }
  if (destino.pantalla) navegador.navigate(destino.pantalla);
}

export function NotificacionesProvider({ children }) {
  const { notificaciones: base = [], productos = [] } = useDatos();

  const [idsLeidas, setIdsLeidas] = useState([]);
  const [recordatorios, setRecordatorios] = useState([]);
  // La hora "actual" que usa la lista; se actualiza sola para quitar los vencidos
  const [ahora, setAhora] = useState(() => Date.now());

  // Vuelve a leer las notificaciones diarias que ya sonaron
  const refrescarRecordatorios = useCallback(async () => {
    setAhora(Date.now());
    try {
      const lista = await obtenerRecordatoriosPasados();
      setRecordatorios(lista);
    } catch {
      // si falla, se queda la lista anterior
    }
  }, []);

  // Al abrir la app: recupera las leídas y las notificaciones que ya sonaron
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_LEIDAS)
      .then((valor) => {
        if (!valor) return;
        const ids = JSON.parse(valor);
        if (Array.isArray(ids)) setIdsLeidas(ids);
      })
      .catch(() => {});
    refrescarRecordatorios();
  }, [refrescarRecordatorios]);

  // Cada minuto se revisa si algún aviso ya cumplió 24 horas
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), REVISAR_CADA_MS);
    return () => clearInterval(reloj);
  }, []);

  // Al regresar a la app (desde segundo plano) se actualiza la lista
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescarRecordatorios();
    });
    return () => sub.remove();
  }, [refrescarRecordatorios]);

  // Si una notificación llega con la app abierta, aparece al momento en Avisos
  useEffect(() => {
    if (!Notifications) return undefined; // Android en Expo Go
    const sub = Notifications.addNotificationReceivedListener(() => {
      refrescarRecordatorios();
    });
    return () => sub.remove();
  }, [refrescarRecordatorios]);

  // Con los productos cargados: pide permiso y programa las notificaciones diarias
  useEffect(() => {
    if (productos.length === 0) return;
    let activo = true;
    (async () => {
      const permitido = await pedirPermiso();
      if (!permitido || !activo) return;
      await programarRecordatorios(productos);
      if (activo) refrescarRecordatorios();
    })();
    return () => {
      activo = false;
    };
  }, [productos, refrescarRecordatorios]);

  const guardar = (ids) => {
    AsyncStorage.setItem(CLAVE_LEIDAS, JSON.stringify(ids)).catch(() => {});
  };

  // Lista final: Supabase + diarias, solo las de las últimas 24 horas,
  // las más nuevas primero, con su marca de leída
  const notificaciones = useMemo(() => {
    const todas = [...base, ...recordatorios]
      .filter((n) => sigueVigente(n, ahora))
      .map((n) => ({
        ...n,
        leida: idsLeidas.includes(n.id),
      }));
    return todas.sort(
      (a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime()
    );
  }, [base, recordatorios, idsLeidas, ahora]);

  const marcarLeida = useCallback(
    (id) =>
      setIdsLeidas((prev) => {
        if (prev.includes(id)) return prev;
        const nuevos = [...prev, id];
        guardar(nuevos);
        return nuevos;
      }),
    []
  );

  const marcarTodas = () =>
    setIdsLeidas((prev) => {
      const nuevos = Array.from(new Set([...prev, ...notificaciones.map((n) => n.id)]));
      guardar(nuevos);
      return nuevos;
    });

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <NotificacionesContext.Provider
      value={{ notificaciones, marcarLeida, marcarTodas, noLeidas, refrescarRecordatorios }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  return useContext(NotificacionesContext);
}