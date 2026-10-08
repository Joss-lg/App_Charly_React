// src/components/FiltrosCategorias.js
// Botones de filtro del Inicio (Todos, Favoritos, Pizzas, Paquetes, Snacks, Bebidas)
// con su contador. Optimizado: los contadores se calculan una sola vez
// y el componente solo se redibuja cuando algo cambia de verdad.
// - Las categorías sin productos se esconden (Todos y Favoritos siempre se ven).
// - Los colores vienen de src/config/marca.js.

import { memo, useMemo } from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { useFavoritos } from '../context/FavoritosContext';
import { useDatos } from '../context/DatosContext';
import { esPaqueteDePromos } from '../data/paquetes';
import { COLORES } from '../config/marca';

const trazo = (color) => ({
  stroke: color,
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
});

function IconoTodos({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" {...trazo(color)} />
    </Svg>
  );
}

function IconoFavoritos({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" {...trazo(color)} />
    </Svg>
  );
}

// Rebanada de pizza: orilla arriba y punta hacia abajo
function IconoPizzas({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M3.5 7C9 4 15 4 20.5 7L12 21Z" {...trazo(color)} />
      <Path d="M5.6 10.2c4.2-2 8.6-2 12.8 0" {...trazo(color)} />
      <Circle cx="10.5" cy="13" r="1.1" {...trazo(color)} />
      <Circle cx="13.6" cy="15.6" r="0.9" {...trazo(color)} />
    </Svg>
  );
}

function IconoPaquetes({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M4 8l8-4 8 4v8l-8 4-8-4ZM4 8l8 4 8-4M12 12v8" {...trazo(color)} />
    </Svg>
  );
}

function IconoSnacks({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M4 11C4 7 7.6 5 12 5s8 2 8 6ZM3.5 14.5h17M5 17.5h14v.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" {...trazo(color)} />
    </Svg>
  );
}

function IconoBebidas({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M6 8h12l-1.3 12H7.3ZM5 8h14M12 8l2-5h3" {...trazo(color)} />
    </Svg>
  );
}

const categorias = [
  { nombre: 'Todos', Icono: IconoTodos, siempre: true },
  { nombre: 'Favoritos', Icono: IconoFavoritos, siempre: true },
  { nombre: 'Pizzas', Icono: IconoPizzas },
  { nombre: 'Paquetes', Icono: IconoPaquetes },
  { nombre: 'Snacks', Icono: IconoSnacks },
  { nombre: 'Bebidas', Icono: IconoBebidas },
];

function FiltrosCategorias({ categoriaActiva, onSelect }) {
  const { tema, modoOscuro } = useTema();
  const { favoritos } = useFavoritos();
  const { productos } = useDatos();

  // Productos que se ven en el Inicio (sin los paquetes que solo van en Promos)
  const productosInicio = useMemo(
    () => productos.filter((p) => !esPaqueteDePromos(p)),
    [productos]
  );

  // Cuántos productos hay en cada categoría (se calcula una sola vez)
  const conteos = useMemo(() => {
    const resultado = { Todos: productosInicio.length, Favoritos: 0 };
    productosInicio.forEach((p) => {
      resultado[p.categoria] = (resultado[p.categoria] || 0) + 1;
      // Solo cuenta favoritos que sigan existiendo en el menú del Inicio
      if (favoritos.includes(p.id)) resultado.Favoritos += 1;
    });
    return resultado;
  }, [productosInicio, favoritos]);

  // Solo las categorías que tienen productos (y las que siempre se ven)
  const visibles = categorias.filter(
    (c) => c.siempre || (conteos[c.nombre] ?? 0) > 0 || c.nombre === categoriaActiva
  );

  const seleccionar = (nombre) => {
    if (nombre === categoriaActiva) return;
    Haptics.selectionAsync().catch(() => {});
    onSelect(nombre);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {visibles.map(({ nombre, Icono }) => {
        const activo = categoriaActiva === nombre;
        const total = conteos[nombre] ?? 0;
        const colorTexto = activo ? COLORES.textoSobrePrimario : tema.texto;
        const colorIcono = activo ? COLORES.textoSobrePrimario : COLORES.primario;

        return (
          <Pressable
            key={nombre}
            onPress={() => seleccionar(nombre)}
            style={({ pressed }) => [
              styles.pill,
              activo
                ? styles.pillActivo
                : {
                    backgroundColor: tema.card,
                    borderColor: modoOscuro ? '#333333' : '#E8E8E8',
                  },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${nombre}, ${total} productos`}
          >
            <Icono color={colorIcono} />
            <Text style={[styles.texto, { color: colorTexto }]}>{nombre}</Text>
            <View
              style={[
                styles.contador,
                {
                  backgroundColor: activo
                    ? 'rgba(255,255,255,0.22)'
                    : modoOscuro ? '#333333' : '#F2F2F2',
                },
              ]}
            >
              <Text
                style={[
                  styles.contadorTexto,
                  { color: activo ? COLORES.textoSobrePrimario : tema.textoSecundario },
                ]}
              >
                {total}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Solo se redibuja si cambia el filtro activo (o favoritos, productos o tema)
export default memo(FiltrosCategorias);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActivo: {
    backgroundColor: COLORES.primario,
    borderColor: COLORES.primario,
    shadowColor: COLORES.primario,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  texto: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  contador: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contadorTexto: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
  },
});