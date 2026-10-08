// src/context/ThemeContext.js
// Tema claro / oscuro de la app.
// - Por defecto SIGUE AL TELÉFONO y cambia solo al momento en que el teléfono cambia.
// - El botón de sol/luna lo cambia a mano, pero en cuanto el teléfono vuelve a
//   cambiar de modo, la app se sincroniza otra vez con él.
// - Los colores de la marca vienen de src/config/marca.js.

import { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARCA, COLORES } from '../config/marca';

const ThemeContext = createContext();
const CLAVE_TEMA = `${MARCA.prefijoGuardado}:temaManual`;

export const colores = {
  claro: {
    fondo: '#F5F0F0',          // fondo cálido con toque muy sutil de rojo
    card: '#FFFFFF',
    header: '#111111',          // header siempre oscuro (marca: rojo/negro/blanco)
    texto: '#1A1A1A',
    textoSecundario: '#666666',
    textoSoloInfo: '#999999',
    pill: '#EEEEEE',
    pillBorde: '#DDDDDD',
    pillTexto: '#555555',
    pillActivoBg: COLORES.primario,
    pillActivoTexto: COLORES.textoSobrePrimario,
    pillActivoBorde: COLORES.primario,
    sucursalBorde: '#CCCCCC',
    sucursalTexto: '#1A1A1A',
    marcaTexto: '#FFFFFF',      // siempre blanco sobre header oscuro
    precio: COLORES.primario,
    primario: COLORES.primario,
    textoSobrePrimario: COLORES.textoSobrePrimario,
    statusBar: 'light',         // barra de estado clara (texto blanco) sobre header oscuro
  },
  oscuro: {
    fondo: '#0F0F0F',
    card: '#1C1C1C',
    header: '#0A0A0A',          // aún más oscuro en modo dark
    texto: '#FFFFFF',
    textoSecundario: '#CCCCCC',
    textoSoloInfo: '#666666',
    pill: 'transparent',
    pillBorde: '#333333',
    pillTexto: '#AAAAAA',
    pillActivoBg: COLORES.primario,
    pillActivoTexto: COLORES.textoSobrePrimario,
    pillActivoBorde: COLORES.primario,
    sucursalBorde: '#333333',
    sucursalTexto: '#FFFFFF',
    marcaTexto: '#FFFFFF',
    precio: COLORES.primarioClaro,
    primario: COLORES.primario,
    textoSobrePrimario: COLORES.textoSobrePrimario,
    statusBar: 'light',
  },
};

function useModoTelefono() {
  const [modo, setModo] = useState(() => Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    const subApariencia = Appearance.addChangeListener(({ colorScheme }) => {
      if (AppState.currentState === 'active' && colorScheme) setModo(colorScheme);
    });
    const subEstado = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        const actual = Appearance.getColorScheme();
        if (actual) setModo(actual);
      }
    });
    return () => {
      subApariencia.remove();
      subEstado.remove();
    };
  }, []);

  return modo;
}

export function ThemeProvider({ children }) {
  const modoTelefono = useModoTelefono();
  const [manual, setManual] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_TEMA)
      .then((valor) => {
        if (!valor) return;
        const guardado = JSON.parse(valor);
        if (guardado && typeof guardado.oscuro === 'boolean' && guardado.telefono) {
          setManual(guardado);
        }
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  useEffect(() => {
    if (manual && manual.telefono !== modoTelefono) {
      setManual(null);
      AsyncStorage.removeItem(CLAVE_TEMA).catch(() => {});
    }
  }, [modoTelefono, manual]);

  const modoOscuro = manual ? manual.oscuro : modoTelefono === 'dark';

  const toggleTema = () => {
    const nuevo = !modoOscuro;
    if (nuevo === (modoTelefono === 'dark')) {
      setManual(null);
      AsyncStorage.removeItem(CLAVE_TEMA).catch(() => {});
      return;
    }
    const eleccion = { oscuro: nuevo, telefono: modoTelefono };
    setManual(eleccion);
    AsyncStorage.setItem(CLAVE_TEMA, JSON.stringify(eleccion)).catch(() => {});
  };

  const tema = modoOscuro ? colores.oscuro : colores.claro;

  if (!cargado) return null;

  return (
    <ThemeContext.Provider value={{ modoOscuro, toggleTema, tema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  return useContext(ThemeContext);
}