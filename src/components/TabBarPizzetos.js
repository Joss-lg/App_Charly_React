// src/components/TabBarPizzetos.js
// Barra de pestañas con una pizza realista que brinca entre botones.
// (el nombre del archivo se quedó del proyecto original)
// - La barra es sólida: blanca en modo claro y oscura en modo oscuro.
// - Al cambiar de pestaña: la pizza brinca girando, cae sobre la barra
//   (cubriendo lo blanco), se aplasta un poquito y suelta ondas rojas.
// - Los nombres de las pestañas quedan en su propia franja de abajo:
//   la pizza, su sombra y las ondas no los tocan.
// - Desliza el dedo sobre la barra y la pizza te sigue; al soltar,
//   abre la pestaña donde levantaste el dedo.
// - Los colores vienen de src/config/marca.js.

import { memo, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, Platform, PanResponder,
} from 'react-native';
import Svg, {
  Path, Circle, Line, G, Ellipse, Defs, RadialGradient, Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';
import {
  IconoInicio, IconoPromos, IconoSucursales, IconoNotificaciones,
} from './IconosTab';

// Icono de la pestaña Buscar
function IconoBuscarTab({ color }) {
  return <Ionicons name="search" size={22} color={color} />;
}

const ICONOS = {
  Inicio: IconoInicio,
  Promos: IconoPromos,
  Sucursales: IconoSucursales,
  Notificaciones: IconoNotificaciones,
  Buscar: IconoBuscarTab,
};

const ETIQUETAS = {
  Inicio: 'Inicio',
  Promos: 'Promos',
  Sucursales: 'Sucursales',
  Notificaciones: 'Avisos',
  Buscar: 'Buscar',
};

const ES_ANDROID = Platform.OS === 'android';
const MARCA_COLOR = COLORES.primario;

// ── Medidas de la barra ──
const ALTO = 70;              // alto de la barra (más alto = más espacio para los nombres)
const PADX = 14;              // espacio a los lados dentro de la barra
const RADIO_BARRA = 32;       // esquinas redondeadas de la barra
const BOLA = 52;              // tamaño de la pizza
const RADIO_BOLA = BOLA / 2;
const BOLA_CENTRO_Y = 0;      // dónde se queda la pizza (más chico = más arriba, lejos de los nombres)
const ONDA = 64;              // tamaño inicial de las ondas
const ZONA_ONDAS = 40;        // las ondas solo se ven en esta franja de arriba (no tocan los nombres)
const ALTURA_SALTO = -30;     // qué tan alto brinca la pizza

const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));

// Convierte un color "#RRGGBB" a "rgba(r,g,b,alfa)" para darle transparencia
function conTransparencia(hex, alfa) {
  const limpio = hex.replace('#', '');
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alfa})`;
}

// Vibración suave al pasar de una pestaña a otra mientras arrastras
function vibrarCambio() {
  if (ES_ANDROID) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else {
    Haptics.selectionAsync().catch(() => {});
  }
}

// ── Datos del dibujo de la pizza (dibujo de 100 x 100) ──
const PEPERONIS = [
  { x: 50, y: 50, r: 7.5 }, { x: 72, y: 40, r: 7 }, { x: 66, y: 67, r: 7 },
  { x: 42, y: 72, r: 7.2 }, { x: 28, y: 60, r: 6.8 }, { x: 30, y: 35, r: 7 },
  { x: 52, y: 26, r: 7 }, { x: 80, y: 58, r: 5.5 }, { x: 20, y: 45, r: 5.5 },
  { x: 60, y: 80, r: 5 }, { x: 70, y: 22, r: 5 },
];
const HOJAS = [
  { x: 40, y: 41, giro: -30 },
  { x: 60, y: 56, giro: 55 },
  { x: 44, y: 61, giro: 120 },
];
// Ampollas de la orilla de la masa
const AMPOLLAS = [8, 35, 62, 95, 120, 150, 178, 205, 232, 262, 290, 318, 345].map((grados, i) => {
  const r = (grados * Math.PI) / 180;
  return { x: 50 + 45 * Math.cos(r), y: 50 + 45 * Math.sin(r), tam: [2.2, 3, 2.6][i % 3] };
});
// Manchas doradas del queso y brillos
const DORADOS = [
  { x: 36, y: 50, r: 4 }, { x: 62, y: 30, r: 3.5 }, { x: 70, y: 62, r: 4 },
  { x: 48, y: 68, r: 3.2 }, { x: 33, y: 28, r: 3 }, { x: 58, y: 46, r: 3 },
];
const BRILLOS = [
  { x: 44, y: 36, r: 3 }, { x: 66, y: 50, r: 2.5 }, { x: 36, y: 64, r: 2.5 },
];

// Dibujo de la pizza (se dibuja una sola vez)
const Pizza = memo(function Pizza() {
  return (
    <Svg width={BOLA} height={BOLA} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="masa" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#F3C877" />
          <Stop offset="0.8" stopColor="#DDA04A" />
          <Stop offset="1" stopColor="#A8651F" />
        </RadialGradient>
        <RadialGradient id="queso" cx="0.42" cy="0.38" r="0.7">
          <Stop offset="0" stopColor="#FFEDAA" />
          <Stop offset="0.6" stopColor="#F7C95A" />
          <Stop offset="1" stopColor="#E0952E" />
        </RadialGradient>
        <RadialGradient id="pep" cx="0.4" cy="0.35" r="0.75">
          <Stop offset="0" stopColor="#E2453A" />
          <Stop offset="0.6" stopColor="#BE2A20" />
          <Stop offset="1" stopColor="#7E140E" />
        </RadialGradient>
      </Defs>

      {/* Masa */}
      <Circle cx="50" cy="50" r="49" fill="url(#masa)" />
      {AMPOLLAS.map((a, i) => (
        <G key={`a${i}`}>
          <Circle cx={a.x} cy={a.y} r={a.tam} fill="#8E5416" opacity={0.3} />
          <Circle cx={a.x - 0.6} cy={a.y - 0.6} r={a.tam * 0.45} fill="#F6D58E" opacity={0.45} />
        </G>
      ))}
      <Path
        d="M3.2 41.8 A47.5 47.5 0 0 1 45.9 2.7"
        stroke="rgba(255,244,214,0.55)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />

      {/* Salsa que se asoma y queso */}
      <Circle cx="50" cy="50" r="43" fill="#B83A22" />
      <Circle cx="50" cy="50" r="41.5" fill="url(#queso)" />
      {DORADOS.map((d, i) => (
        <Circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill="#B8651E" opacity={0.28} />
      ))}
      {BRILLOS.map((b, i) => (
        <Circle key={`b${i}`} cx={b.x} cy={b.y} r={b.r} fill="#FFFFFF" opacity={0.3} />
      ))}

      {/* Pepperoni con sombra, volumen y brillo */}
      {PEPERONIS.map((p, i) => (
        <G key={`p${i}`}>
          <Circle cx={p.x + 1} cy={p.y + 1.8} r={p.r} fill="#4A1A08" opacity={0.35} />
          <Circle cx={p.x} cy={p.y} r={p.r} fill="url(#pep)" />
          <Circle
            cx={p.x} cy={p.y} r={p.r - 0.5}
            fill="none" stroke="#7A130D" strokeWidth={0.8} opacity={0.6}
          />
          <Circle cx={p.x + p.r * 0.3} cy={p.y + p.r * 0.2} r={p.r * 0.12} fill="#F4A58E" opacity={0.6} />
          <Circle cx={p.x - p.r * 0.35} cy={p.y + p.r * 0.35} r={p.r * 0.1} fill="#F4A58E" opacity={0.5} />
          <Circle cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.35} r={p.r * 0.28} fill="#FFFFFF" opacity={0.25} />
        </G>
      ))}

      {/* Hojas de albahaca */}
      {HOJAS.map((h, i) => (
        <G key={`h${i}`} transform={`rotate(${h.giro} ${h.x} ${h.y})`}>
          <Ellipse cx={h.x} cy={h.y} rx={5} ry={2.6} fill="#3F8A36" />
          <Line
            x1={h.x - 4.2} y1={h.y} x2={h.x + 4.2} y2={h.y}
            stroke="#A5D6A7" strokeWidth={0.5} opacity={0.7}
          />
        </G>
      ))}

      {/* Brillo suave general */}
      <Ellipse
        cx="38" cy="30" rx="26" ry="14"
        fill="rgba(255,255,255,0.10)"
        transform="rotate(-30 38 30)"
      />
    </Svg>
  );
});

export default function TabBarPizzetos({ state, descriptors, navigation }) {
  const { modoOscuro } = useTema();
  const insets = useSafeAreaInsets();
  const [ancho, setAncho] = useState(0);
  // Pestaña bajo el dedo mientras deslizas (null = no estás deslizando)
  const [indiceDedo, setIndiceDedo] = useState(null);

  const total = state.routes.length;
  const anchoItem = ancho ? (ancho - PADX * 2) / total : 0;

  // Valores animados que NO se recrean nunca
  const bolaX = useRef(new Animated.Value(0)).current;      // centro de la pizza
  const salto = useRef(new Animated.Value(0)).current;      // altura del brinco
  const giro = useRef(new Animated.Value(0)).current;       // vueltas de la pizza
  const lupa = useRef(new Animated.Value(0)).current;       // 0 = normal, 1 = arrastrando
  const aplaste = useRef(new Animated.Value(0)).current;    // 1 = pizza aplastada al caer
  const onda1 = useRef(new Animated.Value(0)).current;      // primera onda roja
  const onda2 = useRef(new Animated.Value(0)).current;      // segunda onda roja
  const bolaIzq = useRef(Animated.add(bolaX, -RADIO_BOLA)).current;
  const ondaIzq = useRef(Animated.add(bolaX, -ONDA / 2)).current;
  const escalaLupa = useRef(
    lupa.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] })
  ).current;
  // Al caer: más ancha y más baja
  const escalaX = useRef(
    Animated.add(escalaLupa, aplaste.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }))
  ).current;
  const escalaY = useRef(
    Animated.add(escalaLupa, aplaste.interpolate({ inputRange: [0, 1], outputRange: [0, -0.16] }))
  ).current;
  const giroTotal = useRef(0);
  const indiceAnimado = useRef(state.index);

  const barraRef = useRef(null);
  const barraX = useRef(0);
  const dedoRef = useRef(null);

  const centroDe = (indice) => PADX + anchoItem * (indice + 0.5);

  // Brinco de la pizza hacia la pestaña "indice"
  const animarA = (indice) => {
    if (!anchoItem) return;
    indiceAnimado.current = indice;
    const destino = centroDe(indice);

    [bolaX, salto, giro, aplaste, onda1, onda2].forEach((v) => v.stopAnimation());
    onda1.setValue(0);
    onda2.setValue(0);
    giroTotal.current += 1;

    Animated.parallel([
      // La pizza viaja de lado
      Animated.timing(bolaX, {
        toValue: destino,
        duration: 430,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // Brinca en arco y cae con rebote
      Animated.sequence([
        Animated.timing(salto, {
          toValue: ALTURA_SALTO,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(salto, {
          toValue: 0,
          duration: 230,
          easing: Easing.bounce,
          useNativeDriver: false,
        }),
      ]),
      // Gira una vuelta completa
      Animated.timing(giro, {
        toValue: giroTotal.current,
        duration: 430,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // Al caer: se aplasta un poquito y rebota
      Animated.sequence([
        Animated.delay(410),
        Animated.timing(aplaste, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.spring(aplaste, {
          toValue: 0,
          damping: 5,
          stiffness: 220,
          useNativeDriver: false,
        }),
      ]),
      // Al caer: dos ondas rojas se expanden por la barra
      Animated.sequence([
        Animated.delay(410),
        Animated.parallel([
          Animated.timing(onda1, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.delay(150),
            Animated.timing(onda2, {
              toValue: 1,
              duration: 800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }),
          ]),
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
      animarA(indice);
      navigation.navigate(route.name);
    } else {
      animarA(state.index); // regresa la pizza a su lugar
    }
  };

  // Lo más nuevo, para usarlo dentro del gesto (que se crea una sola vez)
  const ultimo = useRef({});
  ultimo.current = { anchoItem, total, irAPestana, indiceActual: state.index };

  // Dónde poner la pizza para que quede bajo el dedo
  const posicionDesdeDedo = (pageX) => {
    const { anchoItem: a, total: n } = ultimo.current;
    if (!a) return 0;
    return limitar(pageX - barraX.current, PADX + a / 2, PADX + a * (n - 0.5));
  };

  // Marca la pestaña bajo el dedo (con vibración suave al cambiar)
  const marcarPestana = (x) => {
    const { anchoItem: a, total: n } = ultimo.current;
    if (!a) return;
    const indice = limitar(Math.round((x - PADX - a / 2) / a), 0, n - 1);
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
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (_, g) => {
        barraRef.current?.measureInWindow((x) => {
          if (typeof x === 'number') barraX.current = x;
        });

        [bolaX, salto, giro, aplaste, onda1, onda2].forEach((v) => v.stopAnimation());
        onda1.setValue(0);
        onda2.setValue(0);
        aplaste.setValue(0);

        const destino = posicionDesdeDedo(g.x0 + g.dx);
        marcarPestana(destino);

        Animated.parallel([
          Animated.spring(bolaX, { toValue: destino, speed: 30, bounciness: 4, useNativeDriver: false }),
          Animated.timing(salto, { toValue: -6, duration: 120, useNativeDriver: false }),
          Animated.spring(lupa, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: false }),
        ]).start();
      },

      onPanResponderMove: (_, g) => {
        const destino = posicionDesdeDedo(g.moveX);
        bolaX.setValue(destino);
        marcarPestana(destino);
      },

      onPanResponderRelease: terminarArrastre,
      onPanResponderTerminate: terminarArrastre,
    })
  ).current;

  // Al medir la barra por primera vez, coloca la pizza sin animar
  useEffect(() => {
    if (!anchoItem) return;
    bolaX.setValue(PADX + anchoItem * (state.index + 0.5));
  }, [anchoItem]);

  // Si la pestaña cambia desde otro lado (botón Sucursales, notificaciones, etc.)
  useEffect(() => {
    if (state.index !== indiceAnimado.current) animarA(state.index);
  }, [state.index, anchoItem]);

  const colorInactivo = modoOscuro ? '#D6D6D6' : '#3A3A3A';

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
          styles.barra,
          {
            backgroundColor: modoOscuro ? '#1E1E1E' : '#FFFFFF',
            borderColor: modoOscuro ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
            shadowOpacity: modoOscuro ? 0.6 : 0.18,
          },
        ]}
        onLayout={(e) => {
          setAncho(e.nativeEvent.layout.width);
          barraRef.current?.measureInWindow((x) => {
            if (typeof x === 'number') barraX.current = x;
          });
        }}
        {...gestos.panHandlers}
      >
        {/* Ondas rojas que se expanden por la parte de arriba de la barra
            (no llegan a los nombres de abajo) */}
        {ancho > 0 && (
          <View pointerEvents="none" style={styles.ondasClip}>
            {[onda1, onda2].map((o, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.onda,
                  {
                    opacity: o.interpolate({
                      inputRange: [0, 0.12, 1],
                      outputRange: [0, 0.6, 0],
                    }),
                    transform: [
                      { translateX: ondaIzq },
                      {
                        scale: o.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 3.6],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Botones */}
        <View style={styles.fila}>
          {state.routes.map((route, index) => {
            const enfocado = state.index === index;
            const marcado = indiceVisual === index;
            const { options } = descriptors[route.key];
            const Icono = ICONOS[route.name];
            const badge = options.tabBarBadge;

            return (
              <Pressable
                key={route.key}
                onPress={() => irAPestana(index)}
                style={styles.item}
                accessibilityRole="button"
                accessibilityState={enfocado ? { selected: true } : {}}
                accessibilityLabel={ETIQUETAS[route.name]}
              >
                <View style={styles.cajaIcono}>
                  {/* En la pestaña marcada no hay icono: ahí está la pizza */}
                  {!marcado && Icono && <Icono color={colorInactivo} activo={false} />}
                  {badge !== undefined && !marcado && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTexto}>{badge}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.etiqueta,
                    {
                      color: marcado ? MARCA_COLOR : colorInactivo,
                      fontFamily: marcado ? 'Poppins_700Bold' : 'Poppins_600SemiBold',
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {ETIQUETAS[route.name]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* La pizza que brinca y cae sobre la barra */}
        {ancho > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bola,
              {
                transform: [
                  { translateX: bolaIzq },
                  { translateY: salto },
                  { scaleX: escalaX },
                  { scaleY: escalaY },
                ],
              },
            ]}
          >
            {/* Sombra pequeña pegada a la pizza (no llega a los nombres) */}
            <View style={styles.sombraBolaGrande} />
            <View style={styles.sombraBola} />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    {
                      rotate: giro.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pizza />
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  barra: {
    height: ALTO,
    borderRadius: RADIO_BARRA,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  // Franja de arriba donde se ven las ondas (más corta que la barra para no tapar los nombres)
  ondasClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ZONA_ONDAS,
    borderTopLeftRadius: RADIO_BARRA,
    borderTopRightRadius: RADIO_BARRA,
    overflow: 'hidden',
  },
  onda: {
    position: 'absolute',
    left: 0,
    top: BOLA_CENTRO_Y - ONDA / 2,
    width: ONDA,
    height: ONDA,
    borderRadius: ONDA / 2,
    borderWidth: 2,
    borderColor: MARCA_COLOR,
    backgroundColor: conTransparencia(MARCA_COLOR, 0.12),
  },
  fila: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    paddingHorizontal: PADX,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    gap: 2,
  },
  cajaIcono: {
    height: 24,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    fontSize: 10.5,
    letterSpacing: 0.2,
    maxWidth: '100%',
  },
  // Sin sombra ni elevation: en Android esa sombra se extendía hacia abajo
  // y oscurecía los nombres. La sombra ahora es dibujada y queda pegada a la pizza.
  bola: {
    position: 'absolute',
    left: 0,
    top: BOLA_CENTRO_Y - RADIO_BOLA,
    width: BOLA,
    height: BOLA,
  },
  sombraBola: {
    position: 'absolute',
    left: -1,
    top: 2,
    width: BOLA + 2,
    height: BOLA + 2,
    borderRadius: (BOLA + 2) / 2,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  sombraBolaGrande: {
    position: 'absolute',
    left: -3,
    top: 2,
    width: BOLA + 6,
    height: BOLA + 6,
    borderRadius: (BOLA + 6) / 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
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
    fontSize: 10,
    lineHeight: 12,
  },
});