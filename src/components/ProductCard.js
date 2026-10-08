// src/components/ProductCard.js
// Tarjeta horizontal con imagen circular a la izquierda (estilo moderno de app de comida).
// Todas las animaciones intactas: entrada escalonada, zoom, destello, inclinación 3D,
// flecha animada, barra de progreso y Vista Rápida.

import { memo, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Dimensions, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';
import ImageBackground from './ImagenFondo';
import BotonFavorito from './BotonFavorito';
import VistaRapida from './VistaRapida';

const { width } = Dimensions.get('window');

const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);
const INCLINACION = 2.5;
const TIEMPO_VISTA_RAPIDA = 450;
const ESPERA_NAVEGAR = 140;
const MAX_ANIMADAS = 6;
const MARGEN = 16;
const DIAMETRO = 84; // tamaño del círculo de imagen

const limitar = (n) => Math.max(-1, Math.min(1, n));

function Flecha({ color = '#FFFFFF', size = 15 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function crearAnimaciones(animarEntrada) {
  const inicio = animarEntrada ? 0 : 1;
  const aparicion  = new Animated.Value(inicio);
  const revelado   = new Animated.Value(inicio);
  const presion    = new Animated.Value(0);
  const inclinacion = new Animated.Value(0);
  const progreso   = new Animated.Value(0);
  const brillo     = new Animated.Value(inicio);
  const flecha     = new Animated.Value(0);

  return {
    aparicion, revelado, presion, inclinacion, progreso, brillo, flecha,

    entradaY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
    escalaTotal: Animated.multiply(
      aparicion.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
      presion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] })
    ),
    rotY: inclinacion.interpolate({
      inputRange: [-1, 1],
      outputRange: [`-${INCLINACION}deg`, `${INCLINACION}deg`],
    }),
    aro: presion.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),

    // Imagen circular: zoom al entrar y al presionar
    zoomFoto: Animated.multiply(
      revelado.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }),
      presion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08], extrapolate: 'clamp' })
    ),

    // Info derecha: aparece deslizándose desde abajo
    textoOpacidad: revelado.interpolate({ inputRange: [0, 0.3, 0.8], outputRange: [0, 0, 1] }),
    textoX: revelado.interpolate({ inputRange: [0, 0.4, 1], outputRange: [16, 16, 0] }),

    // Destello diagonal sobre la tarjeta completa
    brilloX: brillo.interpolate({ inputRange: [0, 1], outputRange: [-160, width + 60] }),

    // Flecha animada
    flecha1X:  flecha.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }),
    flecha1Op: flecha.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }),
    flecha2X:  flecha.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
    flecha2Op: flecha.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    escalaBoton: presion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14], extrapolate: 'clamp' }),

    progresoOp: progreso.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] }),
  };
}

function ProductCard({ producto, posicion = -1, animarAl = null }) {
  const { tema, modoOscuro } = useTema();
  const navigation = useNavigation();
  const [vistaRapida, setVistaRapida] = useState(false);
  const [vistaMontada, setVistaMontada] = useState(false);
  const navegando = useRef(false);
  const temporizador = useRef(null);

  const animarEntrada = animarAl != null && posicion >= 0 && posicion < MAX_ANIMADAS;
  const posicionRef = useRef(posicion);
  posicionRef.current = posicion;

  const anim = useRef(null);
  if (!anim.current) anim.current = crearAnimaciones(animarEntrada);
  const a = anim.current;

  useEffect(() => {
    const pos = posicionRef.current;
    const debeAnimar = animarAl != null && pos >= 0 && pos < MAX_ANIMADAS;

    a.aparicion.stopAnimation();
    a.revelado.stopAnimation();
    a.brillo.stopAnimation();

    if (!debeAnimar) {
      a.aparicion.setValue(1);
      a.revelado.setValue(1);
      a.brillo.setValue(1);
      return undefined;
    }

    a.aparicion.setValue(0);
    a.revelado.setValue(0);
    a.brillo.setValue(0);

    const retraso = pos * 80;
    const entrada = Animated.parallel([
      Animated.timing(a.aparicion, {
        toValue: 1, duration: 600, delay: retraso, easing: SUAVE, useNativeDriver: true,
      }),
      Animated.timing(a.revelado, {
        toValue: 1, duration: 900, delay: retraso, easing: SUAVE, useNativeDriver: true,
      }),
      Animated.timing(a.brillo, {
        toValue: 1, duration: 800, delay: retraso + 300,
        easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
      }),
    ]);
    entrada.start();
    return () => entrada.stop();
  }, [animarAl]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const presionar = (e) => {
    const nx = limitar(((e.nativeEvent.pageX - MARGEN) / (width - MARGEN * 2)) * 2 - 1);
    a.progreso.setValue(0);
    Animated.parallel([
      Animated.spring(a.presion, { toValue: 1, speed: 50, bounciness: 0, useNativeDriver: true }),
      Animated.spring(a.inclinacion, { toValue: nx, speed: 40, bounciness: 2, useNativeDriver: true }),
      Animated.timing(a.progreso, {
        toValue: 1, duration: TIEMPO_VISTA_RAPIDA,
        easing: Easing.linear, useNativeDriver: true,
      }),
    ]).start();
  };

  const soltar = () => {
    Animated.parallel([
      Animated.spring(a.presion, { toValue: 0, speed: 16, bounciness: 10, useNativeDriver: true }),
      Animated.spring(a.inclinacion, { toValue: 0, speed: 16, bounciness: 9, useNativeDriver: true }),
      Animated.timing(a.progreso, {
        toValue: 0, duration: 180,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  };

  const abrirVistaRapida = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setVistaMontada(true);
    setVistaRapida(true);
  };

  const irADetalle = () => {
    if (navegando.current) return;
    navegando.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    a.flecha.setValue(0);
    Animated.timing(a.flecha, {
      toValue: 1, duration: 260, easing: SUAVE, useNativeDriver: true,
    }).start();
    temporizador.current = setTimeout(() => {
      navigation.navigate('ProductoDetalle', { id: producto.id });
      temporizador.current = setTimeout(() => {
        a.flecha.setValue(0);
        navegando.current = false;
      }, 600);
    }, ESPERA_NAVEGAR);
  };

  const etiquetaCategoria = producto.subcategoria
    ? `${producto.subcategoria}`
    : producto.categoria;

  // Color del fondo del círculo de imagen (si no hay imagen)
  const fondoCirculo = modoOscuro ? '#2A2A2A' : '#F0F0F0';

  return (
    <>
      <Animated.View
        style={[
          styles.sombra,
          {
            backgroundColor: tema.card,
            opacity: a.aparicion,
            transform: [
              { perspective: 1000 },
              { translateY: a.entradaY },
              { scale: a.escalaTotal },
              { rotateY: a.rotY },
            ],
          },
        ]}
      >
        <Pressable
          onPress={irADetalle}
          onLongPress={abrirVistaRapida}
          delayLongPress={TIEMPO_VISTA_RAPIDA}
          onPressIn={presionar}
          onPressOut={soltar}
          style={[styles.card, { backgroundColor: tema.card }]}
          accessibilityRole="button"
          accessibilityLabel={`${producto.nombre}, ${producto.precioDesde ? 'desde ' : ''}$${producto.precio}. Ver detalle`}
          accessibilityHint="Mantén presionado para vista rápida"
        >
          {/* Destello que cruza toda la tarjeta */}
          {animarEntrada && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.destelloContenedor,
                { transform: [{ translateX: a.brilloX }, { rotate: '12deg' }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          {/* ── IMAGEN CIRCULAR ── */}
          <View style={[styles.circuloContenedor, { backgroundColor: fondoCirculo }]}>
            {/* Aro rojo detrás del círculo */}
            <LinearGradient
              colors={[COLORES.primarioClaro, COLORES.primario, COLORES.primarioOscuro]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.circuloAro}
            />
            <Animated.View
              style={[
                styles.circuloImagen,
                { backgroundColor: fondoCirculo, transform: [{ scale: a.zoomFoto }] },
              ]}
            >
              <ImageBackground
                source={{ uri: producto.imagen }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* Badge oferta */}
            {producto.oferta && (
              <View style={styles.badgeOferta}>
                <Ionicons name="flame" size={9} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* ── INFO DERECHA ── */}
          <Animated.View
            style={[
              styles.info,
              {
                opacity: a.textoOpacidad,
                transform: [{ translateX: a.textoX }],
              },
            ]}
          >
            {/* Categoría */}
            <Text style={[styles.categoria, { color: COLORES.primario }]} numberOfLines={1}>
              {etiquetaCategoria}
            </Text>

            {/* Nombre */}
            <Text style={[styles.nombre, { color: tema.texto }]} numberOfLines={2}>
              {producto.nombre}
            </Text>

            {/* Descripción */}
            {!!producto.descripcion && (
              <Text
                style={[styles.descripcion, { color: tema.textoSecundario }]}
                numberOfLines={1}
              >
                {producto.descripcion}
              </Text>
            )}

            {/* Precio + botones */}
            <View style={styles.filaPrecio}>
              <View>
                {producto.precioDesde && (
                  <Text style={[styles.desde, { color: tema.textoSecundario }]}>Desde</Text>
                )}
                <Text style={[styles.precio, { color: COLORES.primario }]}>
                  ${producto.precio}
                  <Text style={[styles.moneda, { color: tema.textoSoloInfo }]}> MXN</Text>
                </Text>
              </View>

              <View style={styles.botones}>
                <BotonFavorito id={producto.id} size={30} />
                <Animated.View
                  style={[styles.botonFlecha, { transform: [{ scale: a.escalaBoton }] }]}
                >
                  <Animated.View
                    style={[styles.flechaCapa, { opacity: a.flecha1Op, transform: [{ translateX: a.flecha1X }] }]}
                  >
                    <Flecha />
                  </Animated.View>
                  <Animated.View
                    style={[styles.flechaCapa, { opacity: a.flecha2Op, transform: [{ translateX: a.flecha2X }] }]}
                  >
                    <Flecha />
                  </Animated.View>
                </Animated.View>
              </View>
            </View>
          </Animated.View>

          {/* Barra de progreso */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.barraProgreso,
              { opacity: a.progresoOp, transform: [{ scaleX: a.progreso }] },
            ]}
          />
        </Pressable>

        {/* Aro rojo al presionar */}
        <Animated.View pointerEvents="none" style={[styles.aro, { opacity: a.aro }]} />
      </Animated.View>

      {vistaMontada && (
        <VistaRapida
          producto={producto}
          visible={vistaRapida}
          onCerrar={() => setVistaRapida(false)}
          onVerDetalle={irADetalle}
        />
      )}
    </>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  sombra: {
    marginHorizontal: MARGEN,
    marginBottom: 12,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  aro: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORES.primario,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
    minHeight: 110,
  },
  destelloContenedor: {
    zIndex: 10,
    width: 80,
  },

  // ── Imagen circular ──
  circuloContenedor: {
    width: DIAMETRO + 4,
    height: DIAMETRO + 4,
    borderRadius: (DIAMETRO + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloAro: {
    position: 'absolute',
    width: DIAMETRO + 4,
    height: DIAMETRO + 4,
    borderRadius: (DIAMETRO + 4) / 2,
  },
  circuloImagen: {
    width: DIAMETRO,
    height: DIAMETRO,
    borderRadius: DIAMETRO / 2,
    overflow: 'hidden',
  },
  badgeOferta: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORES.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ── Info derecha ──
  info: {
    flex: 1,
    gap: 2,
  },
  categoria: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nombre: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  descripcion: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  desde: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
  },
  precio: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 24,
  },
  moneda: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
  },
  botones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonFlecha: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORES.primario,
    overflow: 'hidden',
    shadowColor: COLORES.primario,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  flechaCapa: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  barraProgreso: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 3,
    backgroundColor: COLORES.primario,
    transformOrigin: 'left',
  },
});