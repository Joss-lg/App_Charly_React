// src/components/TabBarPizzetos.js
// Barra de pestañas flotante (el nombre del archivo se quedó del proyecto original).
// - iPhone: Liquid Glass en claro y vidrio esmerilado en oscuro. Android: fondo sólido.
// - Cápsula del color de la marca que se desliza con rebote al cambiar de pestaña.
// - Desliza el dedo sobre la barra y la cápsula te sigue como una lupa
//   (como en WhatsApp); al soltar, abre la pestaña donde levantaste el dedo.
//   En iPhone brilla como cristal; en Android se pone del color de la marca más intenso.
// - Los colores vienen de src/config/marca.js.

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Platform, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';
import {
  IconoInicio, IconoPromos, IconoSucursales, IconoNotificaciones,
} from './IconosTab';

const ICONOS = {
  Inicio: IconoInicio,
  Promos: IconoPromos,
  Sucursales: IconoSucursales,
  Notificaciones: IconoNotificaciones,
};

const ETIQUETAS = {
  Inicio: 'Inicio',
  Promos: 'Promos',
  Sucursales: 'Sucursales',
  Notificaciones: 'Avisos',
};

const ES_ANDROID = Platform.OS === 'android';

const TIENE_LIQUID_GLASS =
  Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

const PADDING = 6;

// Efecto lupa al arrastrar: crece a lo ancho y casi nada a lo alto
// (si crece mucho de alto, la orilla de la barra la recorta)
const LUPA_ANCHO = 1.14;
const LUPA_ALTO = 1.04;

// Colores del fondo sólido que se usa en Android
const FONDO_ANDROID_CLARO = 'rgba(255,255,255,0.96)';
const FONDO_ANDROID_OSCURO = 'rgba(32,32,32,0.96)';

// Convierte un color "#RRGGBB" a "rgba(r,g,b,alfa)" para darle transparencia
function conTransparencia(hex, alfa) {
  const limpio = hex.replace('#', '');
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alfa})`;
}

const MARCA_COLOR = COLORES.primario;

const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));

// Vibración suave al pasar de una pestaña a otra mientras arrastras
function vibrarCambio() {
  if (ES_ANDROID) {
    // En algunos Android la vibración de "selección" es muy fuerte o no se siente
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else {
    Haptics.selectionAsync().catch(() => {});
  }
}

// iPhone modo claro: Liquid Glass real.
// iPhone modo oscuro: vidrio esmerilado que no apaga los colores.
// Android: fondo sólido casi opaco (el difuminado de Android no es confiable
// y en modo claro hacía que la barra desapareciera).
function FondoVidrio({ modoOscuro, style, children }) {
  if (ES_ANDROID) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: modoOscuro ? FONDO_ANDROID_OSCURO : FONDO_ANDROID_CLARO,
            borderWidth: 1,
            borderColor: modoOscuro ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {children}
      </View>
    );
  }

  if (TIENE_LIQUID_GLASS && !modoOscuro) {
    return (
      <GlassView
        style={style}
        glassEffectStyle="regular"
        tintColor="rgba(255,255,255,0.12)"
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={modoOscuro ? 50 : 45}
      tint={modoOscuro ? 'dark' : 'light'}
      style={[
        style,
        modoOscuro
          ? {
              backgroundColor: 'rgba(40,40,40,0.55)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }
          : { backgroundColor: 'rgba(255,255,255,0.35)' },
      ]}
    >
      {children}
    </BlurView>
  );
}

// Cápsula que se desliza: cristalina en modo claro, sólida en modo oscuro
function Indicador({ modoOscuro }) {
  return (
    <View
      style={[
        styles.indicadorRelleno,
        styles.indicadorVidrio,
        // En Android el fondo es blanco sólido: la cápsula necesita más color para verse
        ES_ANDROID && !modoOscuro && {
          backgroundColor: conTransparencia(MARCA_COLOR, 0.3),
          borderColor: conTransparencia(MARCA_COLOR, 0.3),
        },
        modoOscuro && {
          backgroundColor: conTransparencia(MARCA_COLOR, 0.9),
          borderColor: 'rgba(255,255,255,0.25)',
        },
      ]}
    >
      <View
        style={[
          styles.brillo,
          modoOscuro && { backgroundColor: 'rgba(255,255,255,0.14)' },
        ]}
      />
    </View>
  );
}

export default function TabBarPizzetos({ state, descriptors, navigation }) {
  const { modoOscuro } = useTema();
  const insets = useSafeAreaInsets();
  const [anchoItem, setAnchoItem] = useState(0);
  // Pestaña bajo el dedo mientras deslizas (null = no estás deslizando)
  const [indiceDedo, setIndiceDedo] = useState(null);

  // Valores animados que NO se recrean nunca
  const posicionX = useRef(new Animated.Value(0)).current;
  const escalaX = useRef(new Animated.Value(1)).current;
  const escalaY = useRef(new Animated.Value(1)).current;
  const lupa = useRef(new Animated.Value(0)).current; // 0 = normal, 1 = arrastrando
  const indiceAnimado = useRef(state.index);

  // Para saber dónde está la barra en la pantalla (y poner la cápsula bajo el dedo)
  const barraRef = useRef(null);
  const barraX = useRef(0);
  const dedoRef = useRef(null);

  const total = state.routes.length;

  const animarA = (indice) => {
    if (!anchoItem) return;
    indiceAnimado.current = indice;

    // Detiene cualquier animación anterior para que no se encimen
    posicionX.stopAnimation();
    escalaX.stopAnimation();
    escalaY.stopAnimation();

    Animated.parallel([
      // Deslizamiento con resorte
      Animated.spring(posicionX, {
        toValue: indice * anchoItem,
        damping: 16,
        stiffness: 160,
        mass: 1,
        useNativeDriver: false,
      }),
      // Se estira mientras viaja y regresa con rebote
      Animated.sequence([
        Animated.parallel([
          Animated.timing(escalaX, { toValue: 1.25, duration: 150, useNativeDriver: false }),
          Animated.timing(escalaY, { toValue: 0.88, duration: 150, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.spring(escalaX, { toValue: 1, damping: 8, stiffness: 170, useNativeDriver: false }),
          Animated.spring(escalaY, { toValue: 1, damping: 8, stiffness: 170, useNativeDriver: false }),
        ]),
      ]),
    ]).start();
  };

  // Abre una pestaña (igual que tocarla)
  const irAPestana = (indice) => {
    const route = state.routes[indice];
    if (!route) return;
    const enfocado = state.index === indice;
    const evento = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!enfocado && !evento.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      animarA(indice); // la animación arranca al instante del toque
      navigation.navigate(route.name);
    } else {
      animarA(state.index); // regresa la cápsula a su lugar
    }
  };

  // Lo más nuevo, para usarlo dentro del gesto (que se crea una sola vez)
  const ultimo = useRef({});
  ultimo.current = { anchoItem, total, irAPestana, indiceActual: state.index };

  // Dónde poner la cápsula para que quede centrada bajo el dedo
  const posicionDesdeDedo = (pageX) => {
    const { anchoItem: ancho, total: n } = ultimo.current;
    if (!ancho) return 0;
    return limitar(pageX - barraX.current - PADDING - ancho / 2, 0, (n - 1) * ancho);
  };

  // Marca la pestaña bajo el dedo (con vibración suave al cambiar)
  const marcarPestana = (posicion) => {
    const { anchoItem: ancho } = ultimo.current;
    if (!ancho) return;
    const indice = Math.round(posicion / ancho);
    if (indice !== dedoRef.current) {
      dedoRef.current = indice;
      setIndiceDedo(indice);
      vibrarCambio();
    }
  };

  const terminarArrastre = () => {
    const indice = dedoRef.current ?? ultimo.current.indiceActual;
    dedoRef.current = null;
    setIndiceDedo(null);
    Animated.spring(lupa, { toValue: 0, speed: 14, bounciness: 6, useNativeDriver: false }).start();
    ultimo.current.irAPestana(indice);
  };

  // ── Gesto de deslizar el dedo sobre la barra ──
  const gestos = useRef(
    PanResponder.create({
      // Un toque normal lo manejan los botones; solo se activa al deslizar de lado
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (_, g) => {
        // Por si la barra se movió (rotación, etc.), vuelve a medir su posición
        barraRef.current?.measureInWindow((x) => {
          if (typeof x === 'number') barraX.current = x;
        });

        posicionX.stopAnimation();
        escalaX.stopAnimation();
        escalaY.stopAnimation();

        const destino = posicionDesdeDedo(g.x0 + g.dx);
        marcarPestana(destino);

        // La cápsula salta bajo el dedo y crece como lupa
        Animated.parallel([
          Animated.spring(posicionX, { toValue: destino, speed: 30, bounciness: 4, useNativeDriver: false }),
          Animated.spring(escalaX, { toValue: LUPA_ANCHO, speed: 20, bounciness: 8, useNativeDriver: false }),
          Animated.spring(escalaY, { toValue: LUPA_ALTO, speed: 20, bounciness: 8, useNativeDriver: false }),
          Animated.spring(lupa, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: false }),
        ]).start();
      },

      onPanResponderMove: (_, g) => {
        const destino = posicionDesdeDedo(g.moveX);
        posicionX.setValue(destino);
        marcarPestana(destino);
      },

      onPanResponderRelease: terminarArrastre,
      onPanResponderTerminate: terminarArrastre,
    })
  ).current;

  // Al medir la barra por primera vez, coloca la cápsula sin animar
  useEffect(() => {
    if (anchoItem) posicionX.setValue(state.index * anchoItem);
  }, [anchoItem]);

  // Si la pestaña cambia desde otro lado (botón Sucursales, notificaciones, etc.)
  useEffect(() => {
    if (state.index !== indiceAnimado.current) animarA(state.index);
  }, [state.index, anchoItem]);

  // Contraste para que se lea sobre las fotos
  const colorInactivo = modoOscuro ? '#D6D6D6' : '#3A3A3A';
  // Pestaña marcada: en oscuro la cápsula es sólida, así que se usa blanco
  const colorMarcado = modoOscuro ? COLORES.textoSobrePrimario : '#1A1A1A';
  // Halo detrás del texto: claro en modo claro, oscuro en modo oscuro
  // (en Android el fondo ya es sólido, no hace falta halo)
  const colorHalo = ES_ANDROID
    ? 'transparent'
    : modoOscuro ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';

  // Efecto al arrastrar:
  // iPhone → brillo blanco de cristal. Android → color de la marca más intenso.
  const colorLupa = ES_ANDROID ? MARCA_COLOR : '#FFFFFF';
  let opacidadLupa;
  if (ES_ANDROID) opacidadLupa = modoOscuro ? 0.1 : 0.3;
  else opacidadLupa = modoOscuro ? 0.18 : 0.3;

  // Mientras deslizas, se marca la pestaña bajo el dedo; si no, la actual
  const indiceVisual = indiceDedo ?? state.index;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: Math.max(insets.bottom - 6, 10) }]}
    >
      <View
        ref={barraRef}
        style={[
          styles.sombra,
          modoOscuro && styles.sombraOscura,
          // En Android la sombra (elevation) solo se dibuja si el elemento tiene fondo
          ES_ANDROID && {
            backgroundColor: modoOscuro ? FONDO_ANDROID_OSCURO : FONDO_ANDROID_CLARO,
            elevation: 8,
          },
        ]}
        onLayout={(e) => {
          const ancho = e.nativeEvent.layout.width;
          setAnchoItem((ancho - PADDING * 2) / total);
          barraRef.current?.measureInWindow((x) => {
            if (typeof x === 'number') barraX.current = x;
          });
        }}
        {...gestos.panHandlers}
      >
        <FondoVidrio modoOscuro={modoOscuro} style={styles.barra}>
          {anchoItem > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicador,
                {
                  width: anchoItem,
                  transform: [
                    { translateX: posicionX },
                    { scaleX: escalaX },
                    { scaleY: escalaY },
                  ],
                },
              ]}
            >
              <Indicador modoOscuro={modoOscuro} />
              {/* Efecto extra mientras arrastras (cristal en iPhone, color intenso en Android) */}
              <Animated.View
                style={[
                  styles.brilloLupa,
                  {
                    backgroundColor: colorLupa,
                    opacity: lupa.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, opacidadLupa],
                    }),
                  },
                ]}
              />
            </Animated.View>
          )}

          {state.routes.map((route, index) => {
            const enfocado = state.index === index;
            const marcado = indiceVisual === index;
            const { options } = descriptors[route.key];
            const Icono = ICONOS[route.name];
            const badge = options.tabBarBadge;
            const color = marcado ? colorMarcado : colorInactivo;

            return (
              <Pressable
                key={route.key}
                onPress={() => irAPestana(index)}
                style={styles.item}
                accessibilityRole="button"
                accessibilityState={enfocado ? { selected: true } : {}}
                accessibilityLabel={ETIQUETAS[route.name]}
              >
                <View>
                  <Icono color={color} activo={marcado} />
                  {badge !== undefined && !enfocado && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTexto}>{badge}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.etiqueta,
                    {
                      color,
                      fontFamily: marcado ? 'Poppins_700Bold' : 'Poppins_600SemiBold',
                      // Sin halo en la pestaña marcada: sobre la cápsula no hace falta
                      textShadowColor: marcado ? 'transparent' : colorHalo,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {ETIQUETAS[route.name]}
                </Text>
              </Pressable>
            );
          })}
        </FondoVidrio>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  sombra: {
    borderRadius: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  sombraOscura: {
    // En oscuro la sombra negra casi no se ve; se refuerza para dar profundidad
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  barra: {
    flexDirection: 'row',
    borderRadius: 34,
    overflow: 'hidden',
    padding: PADDING,
  },
  indicador: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
  },
  indicadorRelleno: {
    flex: 1,
    borderRadius: 28,
  },
  indicadorVidrio: {
    backgroundColor: conTransparencia(MARCA_COLOR, 0.28),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    shadowColor: MARCA_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  brillo: {
    position: 'absolute',
    top: 2,
    left: 10,
    right: 10,
    height: '42%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  brilloLupa: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    gap: 2,
  },
  etiqueta: {
    fontSize: 10,
    letterSpacing: 0.2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORES.negro,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTexto: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    lineHeight: 12,
  },
});