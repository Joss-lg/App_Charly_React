// src/context/SucursalContext.js
// Guarda qué sucursal eligió el cliente y la recuerda aunque cierre la app.
// - sucursalId === null significa "todavía no eligió" (se muestra la pantalla de selección).
// - Si el contexto no está conectado en App.js, la app se comporta como antes (sin filtrar).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARCA } from '../config/marca';

const CLAVE = `${MARCA.prefijoGuardado}:sucursalElegida_v1`;

const SucursalContext = createContext({
  sucursalId: null,
  cargado: true,
  elegirSucursal: () => {},
  cambiarSucursal: () => {},
});

export function SucursalProvider({ children }) {
  const [sucursalId, setSucursalId] = useState(null);
  // "cargado" avisa cuándo ya se leyó lo guardado en el teléfono (evita que parpadee la selección)
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((valor) => {
        if (valor !== null && valor !== '') {
          const numero = Number(valor);
          if (!Number.isNaN(numero)) setSucursalId(numero);
        }
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  // El cliente elige una sucursal
  const elegirSucursal = useCallback((id) => {
    const numero = Number(id);
    setSucursalId(numero);
    AsyncStorage.setItem(CLAVE, String(numero)).catch(() => {});
  }, []);

  // El cliente quiere cambiar de sucursal: se borra la elección y vuelve a la selección
  const cambiarSucursal = useCallback(() => {
    setSucursalId(null);
    AsyncStorage.removeItem(CLAVE).catch(() => {});
  }, []);

  const valor = useMemo(
    () => ({ sucursalId, cargado, elegirSucursal, cambiarSucursal }),
    [sucursalId, cargado, elegirSucursal, cambiarSucursal]
  );

  return <SucursalContext.Provider value={valor}>{children}</SucursalContext.Provider>;
}

export function useSucursal() {
  return useContext(SucursalContext);
}