// src/context/FavoritosContext.js
// Guarda en el teléfono los productos que el usuario marcó como favoritos.

import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARCA } from '../config/marca';

const FavoritosContext = createContext();
const CLAVE_FAVORITOS = `${MARCA.prefijoGuardado}:favoritos`;

export function FavoritosProvider({ children }) {
  const [favoritos, setFavoritos] = useState([]); // lista de id de productos

  // Al abrir la app, lee los favoritos guardados
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_FAVORITOS)
      .then((valor) => {
        if (valor) setFavoritos(JSON.parse(valor));
      })
      .catch(() => {});
  }, []);

  const toggleFavorito = (id) =>
    setFavoritos((prev) => {
      const nueva = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      AsyncStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(nueva)).catch(() => {});
      return nueva;
    });

  const esFavorito = (id) => favoritos.includes(id);

  return (
    <FavoritosContext.Provider value={{ favoritos, toggleFavorito, esFavorito }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  return useContext(FavoritosContext);
}