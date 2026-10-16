// src/components/ListaPizzasTamano.js
// Lista estilo carta de restaurante con todas las pizzas en el tamaño elegido.
// Modo claro: filas crema con borde dorado. Modo oscuro: filas grises como el resto de la app.
// Las filas entran una por una; al tocar una se abre su detalle.

import { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';

const FUENTE_TITULOS = 'LilitaOne_400Regular';
const DORADO = '#C9A24B';
const CREMA = '#F8F2E6';
const CAFE = '#2A1F14';
const BORDE_OSCURO = '#2C2C2C';

function Fila({ indice, producto, precio, nombreTamano, onAbrir }) {
  const { tema, modoOscuro } = useTema();
  const entrada = useRef(new Animated.Value(0)).current;
  const presion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animacion = Animated.sequence([
      Animated.delay(Math.min(indice, 12) * 70),
      Animated.spring(entrada, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, []);

  const entraX = entrada.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] });

  const alPresionar = () => {
    Animated.spring(presion, { toValue: 0.97, friction: 6, tension: 220, useNativeDriver: true }).start();
  };
  const alSoltar = () => {
    Animated.spring(presion, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  };
  const alTocar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAbrir(producto.id);
  };

  const colorNombre = modoOscuro ? '#F2F2F2' : CAFE;
  const colorPrecio = modoOscuro ? COLORES.primarioClaro : COLORES.primario;

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [{ translateX: entraX }, { scale: presion }],
      }}
    >
      <Pressable
        onPress={alTocar}
        onPressIn={alPresionar}
        onPressOut={alSoltar}
        accessibilityRole="button"
        accessibilityLabel={`${producto.nombre}, ${nombreTamano}, ${precio} pesos`}
        style={[
          styles.fila,
          {
            backgroundColor: modoOscuro ? tema.card : CREMA,
            borderColor: modoOscuro ? BORDE_OSCURO : 'rgba(201,162,75,0.55)',
          },
        ]}
      >
        <View style={styles.numero}>
          <Text style={styles.numeroTexto}>{String(indice + 1).padStart(2, '0')}</Text>
        </View>

        <Text style={[styles.nombre, { color: colorNombre }]} numberOfLines={1}>
          {producto.nombre}
        </Text>

        <View
          style={[
            styles.puntos,
            { borderColor: modoOscuro ? 'rgba(255,255,255,0.2)' : DORADO },
          ]}
        />

        <Text style={[styles.precio, { color: colorPrecio }]}>${precio}</Text>
      </Pressable>
    </Animated.View>
  );
}

function ListaPizzasTamano({ titulo, nombreTamano, items, onAbrir, onCerrar }) {
  const { tema } = useTema();

  return (
    <View style={styles.seccion}>
      <View style={styles.encabezado}>
        <Text style={[styles.titulo, { color: tema.texto }]}>{titulo}</Text>
        <View style={styles.lineaMarca} />
      </View>
      <Text style={[styles.ayuda, { color: tema.textoSecundario }]}>
        Toca una pizza para ver su detalle
      </Text>

      <View style={styles.lista}>
        {items.map(({ producto, precio }, i) => (
          <Fila
            key={producto.id}
            indice={i}
            producto={producto}
            precio={precio}
            nombreTamano={nombreTamano}
            onAbrir={onAbrir}
          />
        ))}
      </View>

      <Pressable
        onPress={onCerrar}
        hitSlop={8}
        style={({ pressed }) => [styles.quitar, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel="Quitar filtro de tamaño"
      >
        <Ionicons name="close" size={14} color={COLORES.primario} />
        <Text style={styles.quitarTexto}>Quitar filtro</Text>
      </Pressable>
    </View>
  );
}

export default memo(ListaPizzasTamano);

const styles = StyleSheet.create({
  seccion: { marginTop: 20, paddingHorizontal: 16 },
  encabezado: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontFamily: FUENTE_TITULOS, fontSize: 16, letterSpacing: 1.2 },
  lineaMarca: {
    flex: 1,
    height: 2,
    backgroundColor: COLORES.primario,
    marginLeft: 10,
    borderRadius: 2,
  },
  ayuda: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  lista: { gap: 8, marginTop: 10 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
  },
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: { color: '#FFFFFF', fontFamily: FUENTE_TITULOS, fontSize: 12 },
  nombre: { flexShrink: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  puntos: {
    flex: 1,
    height: 1,
    marginTop: 8,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    minWidth: 12,
  },
  precio: { fontFamily: FUENTE_TITULOS, fontSize: 20 },
  quitar: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORES.primario,
  },
  quitarTexto: { color: COLORES.primario, fontFamily: 'Poppins_700Bold', fontSize: 12 },
});