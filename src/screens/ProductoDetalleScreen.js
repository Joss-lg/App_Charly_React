// src/screens/ProductoDetalleScreen.js
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing,
  Linking, Alert, Share, Platform, useWindowDimensions, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Defs, Stop, LinearGradient as SvgGradiente } from 'react-native-svg';
import { useTema } from '../context/ThemeContext';
import { useDatos } from '../context/DatosContext';
import BotonFavorito from '../components/BotonFavorito';
import ElegirSucursal from '../components/ElegirSucursal';
import { IconoChat, IconoTelefono } from '../components/IconosUI';
import { MARCA, COLORES } from '../config/marca';

const ES_ANDROID = Platform.OS === 'android';
const MAX_RELACIONADOS = 10;
const ALTO_BARRA = 56;
const PROPORCION_INICIAL = 1.9;
const PROPORCION_MINIMA = 0.8;
const proporcionesConocidas = new Map();
const SUAVE = Easing.out(Easing.cubic);

const MARCA_COLOR = COLORES.primario;
const MARCA_CLARO = COLORES.primarioClaro;
const MARCA_OSCURO = COLORES.primarioOscuro;
const QUESO_CLARO = '#FFE3A3';
const QUESO = '#F5A623';
const QUESO_OSCURO = '#B86E00';

const FUENTE_TITULOS = 'LilitaOne_400Regular';
const DORADO = '#C9A24B';
const CREMA = '#F8F2E6';
const CAFE = '#2A1F14';

const trazo = (color, grosor = 2.2) => ({
  stroke: color, strokeWidth: grosor,
  strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none',
});

function Degradado({ id, colores }) {
  return (
    <Defs>
      <SvgGradiente id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={colores[0]} />
        <Stop offset="0.5" stopColor={colores[1]} />
        <Stop offset="1" stopColor={colores[2]} />
      </SvgGradiente>
    </Defs>
  );
}

function IconoAtras({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 6l-6 6 6 6" {...trazo(color)} />
    </Svg>
  );
}

function IconoCompartir({ color, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3v12M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" {...trazo(color, 2)} />
    </Svg>
  );
}

function IconoLlama({ size = 14 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Degradado id="llama" colores={[QUESO_CLARO, QUESO, QUESO_OSCURO]} />
      <Path d="M12 2c.6 3.2-1.2 4.9-2.7 6.6C7.8 10.3 6.5 12 6.5 14.6A5.5 5.5 0 0 0 12 20.5a5.5 5.5 0 0 0 5.5-5.9c-.2-2.7-1.8-4.3-2.6-6.3-.4 1.4-1.1 2.3-2.1 2.9.4-3.4-.2-6.3-.8-9.2Z" fill="url(#llama)" />
      <Path d="M12 13c.9 1.3 2 2.2 2 3.7a2 2 0 0 1-4 0c0-1.4 1-2.3 2-3.7Z" fill="#FFF3D1" opacity={0.9} />
    </Svg>
  );
}

const RUTAS_CATEGORIA = {
  Pizzas: 'M3.5 7C9 4 15 4 20.5 7L12 21ZM5.6 10.2c4.2-2 8.6-2 12.8 0',
  Paquetes: 'M4 8l8-4 8 4v8l-8 4-8-4ZM4 8l8 4 8-4M12 12v8',
  Snacks: 'M4 11C4 7 7.6 5 12 5s8 2 8 6ZM3.5 14.5h17M5 17.5h14v.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z',
  Bebidas: 'M6 8h12l-1.3 12H7.3ZM5 8h14M12 8l2-5h3',
};
const RUTA_ESTRELLA = 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z';

function IconoCategoria({ tipo, size = 13, grosor = 2, subcategoria = false }) {
  const d = subcategoria ? RUTA_ESTRELLA : RUTAS_CATEGORIA[tipo];
  if (!d) return null;
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} {...trazo(MARCA_COLOR, grosor)} /></Svg>;
}

function MedallonInfo({ size = 30 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Degradado id="medallon" colores={[MARCA_CLARO, MARCA_COLOR, MARCA_OSCURO]} />
      <Circle cx="15" cy="15" r="14" fill="url(#medallon)" />
      <Circle cx="15" cy="15" r="11.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.8} />
      <Path d="M15 13.5v7" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx="15" cy="9.8" r="1.4" fill="#FFFFFF" />
    </Svg>
  );
}

function Etiqueta({ texto, style }) {
  const { tema } = useTema();
  return (
    <View style={[styles.etiquetaFila, style]}>
      <LinearGradient colors={[MARCA_CLARO, MARCA_COLOR, MARCA_OSCURO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.diamante} />
      <Text style={[styles.etiqueta, { color: tema.precio }]}>{texto}</Text>
    </View>
  );
}

// Fila de un tamaño: círculo con aro dorado que se llena de rojo al elegirlo
function FilaTamano({ t, activo, primera, onPress, onLayout, modoOscuro }) {
  const aparicion = useRef(new Animated.Value(activo ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(aparicion, { toValue: activo ? 1 : 0, speed: 20, bounciness: activo ? 12 : 0, useNativeDriver: true }).start();
  }, [activo]);

  const colorNombre = modoOscuro ? '#F3E7C4' : CAFE;
  const colorSecundario = modoOscuro ? '#CDBFA0' : '#7A6A55';
  const colorPrecio = modoOscuro ? MARCA_CLARO : MARCA_COLOR;

  return (
    <Pressable onPress={onPress} onLayout={onLayout}
      style={({ pressed }) => [
        styles.filaTamano,
        !primera && { borderTopWidth: 1, borderTopColor: 'rgba(201,162,75,0.4)' },
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="radio" accessibilityState={{ selected: activo }}
    >
      <View style={styles.tamanoCaja}>
        <View style={styles.radioAro}>
          <Animated.View style={[styles.radioPunto, { opacity: aparicion, transform: [{ scale: aparicion }] }]} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tamanoNombre, { color: colorNombre }]}>{t.nombre}</Text>
        {t.rebanadas ? <Text style={[styles.tamanoRebanadas, { color: colorSecundario }]}>{t.rebanadas} rebanadas</Text> : null}
      </View>
      <Text style={[styles.tamanoPrecio, { color: activo ? colorPrecio : colorNombre }]}>${t.precio}</Text>
    </Pressable>
  );
}

// ─── REBANADA DE PIZZA (aguja) ───────────────────────────────

function PizzaSliceNeedle({ largo, ancho = 22 }) {
  const H = largo; const W = ancho; const MX = W / 2;
  const CY = Math.round(H * 0.2);
  const sliceD = `M ${MX} ${H} L 1 ${CY + 3} A ${MX - 1} ${CY} 0 0 0 ${W - 1} ${CY + 3} Z`;
  const crustD = `M 1 ${CY + 3} A ${MX - 1} ${CY} 0 0 0 ${W - 1} ${CY + 3}`;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradiente id="psn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={QUESO_CLARO} />
          <Stop offset="0.6" stopColor={QUESO} />
          <Stop offset="1"   stopColor={QUESO_OSCURO} />
        </SvgGradiente>
      </Defs>
      <Path d={sliceD} fill="url(#psn)" />
      <Path d={crustD} fill="none" stroke={QUESO_OSCURO} strokeWidth={4.5} strokeLinecap="round" />
      <Circle cx={MX}     cy={H * 0.52} r={1.9} fill={MARCA_COLOR} opacity={0.9} />
      <Circle cx={MX - 4} cy={H * 0.37} r={1.5} fill={MARCA_COLOR} opacity={0.85} />
      <Circle cx={MX + 4} cy={H * 0.40} r={1.5} fill={MARCA_COLOR} opacity={0.85} />
    </Svg>
  );
}

// ─── ABANICO CON MOVIMIENTO DE RULETA SUAVE ──────────────────

function CarruselGiratorio({ pizzas, onPresionar }) {
  const { width } = useWindowDimensions();
  const N = Math.max(pizzas.length, 1);

  // dragAnim: valor continuo sin clamp (puede ser negativo o >N para wrapping)
  const dragAnim  = useRef(new Animated.Value(0)).current;
  const rawRef    = useRef(0);
  const startRef  = useRef(0);
  const snapRef   = useRef(0);
  const springRef = useRef(null);
  const autoRef   = useRef(null);
  const [snapIdx, setSnapIdx] = useState(0);

  useEffect(() => {
    const id = dragAnim.addListener(({ value }) => { rawRef.current = value; });
    return () => dragAnim.removeListener(id);
  }, []);

  // ── Layout del abanico (igual al diseño aprobado) ──
  const ANCHO    = width - 72;
  const CX       = ANCHO / 2;
  const R_ARC    = 148;
  const STEP_DEG = 26;
  const BASE_SZ  = 90;   // tamaño del slot central
  const NAME_H   = 22;
  const SENS     = 62;   // píxeles por pizza (más alto = más lento y suave)

  // Keyframes de posición para slots -3..+3
  const d2r = d => d * Math.PI / 180;
  const SLOTS  = [-3, -2, -1, 0, 1, 2, 3];
  const TX_KF  = SLOTS.map(s => R_ARC * Math.cos(d2r(s * STEP_DEG - 90)));
  const TY_KF  = SLOTS.map(s => R_ARC * (1 + Math.sin(d2r(s * STEP_DEG - 90))));
  const SC_KF  = SLOTS.map(s => Math.max(0.3, 1 - Math.abs(s) * 0.21));
  const OP_KF  = SLOTS.map(s => Math.max(0.08, 1 - Math.abs(s) * 0.28));

  // Alto del contenedor adaptado al número real de pizzas (sin espacio vacío abajo)
  const maxAbsSlot = N >= 7 ? 3 : N >= 5 ? 2 : N >= 3 ? 1 : 0;
  const maxKfIdx   = 3 + maxAbsSlot;
  const HALF_H     = BASE_SZ / 2 + NAME_H / 2;  // mitad aprox. de la vista de cada pizza
  const H_ARC = Math.ceil(
    8 + HALF_H * (1 + SC_KF[maxKfIdx]) + TY_KF[maxKfIdx] + 8
  );

  // Nodos Animated: slot de cada pizza = i - dragAnim (continuo y con wrap)
  // Para wrapping infinito, calculamos el slot más corto
  const animsRef = useRef(null);
  if (!animsRef.current || animsRef.current.length !== N) {
    // Para cada pizza i, su slot respecto al centro es (i - dragAnim) mod N
    // Usamos un Animated que se recalcula en el listener
    animsRef.current = Array.from({ length: N }, (_, i) => ({
      tx:  new Animated.Value(TX_KF[3]),  // slot 0 = índice 3 en SLOTS
      ty:  new Animated.Value(TY_KF[3]),
      sc:  new Animated.Value(SC_KF[3]),
      op:  new Animated.Value(OP_KF[3]),
    }));
  }

  // Actualizar posiciones de todas las pizzas manualmente
  const updatePositions = (val) => {
    pizzas.forEach((_, i) => {
      // Slot de esta pizza respecto al frente
      let slot = ((i - val) % N + N) % N;
      if (slot > N / 2) slot -= N;  // rango [-N/2, N/2]
      // Clamp al rango de keyframes
      const s = Math.max(-3, Math.min(3, slot));

      // Interpolar manualmente entre los keyframes
      const interp = (kf) => {
        // Encontrar los dos keyframes vecinos
        for (let k = 0; k < SLOTS.length - 1; k++) {
          if (s >= SLOTS[k] && s <= SLOTS[k + 1]) {
            const t = (s - SLOTS[k]) / (SLOTS[k + 1] - SLOTS[k]);
            return kf[k] + (kf[k + 1] - kf[k]) * t;
          }
        }
        return kf[s < SLOTS[0] ? 0 : SLOTS.length - 1];
      };

      const a = animsRef.current[i];
      a.tx.setValue(interp(TX_KF));
      a.ty.setValue(interp(TY_KF));
      a.sc.setValue(interp(SC_KF));
      a.op.setValue(interp(OP_KF));
    });
  };

  // Listener: actualizar posiciones y aguja en tiempo real
  const agujaVal = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const id = dragAnim.addListener(({ value }) => {
      rawRef.current = value;
      updatePositions(value);
      // Aguja: fracción del índice actual (0=izq, 0.5=centro, 1=der)
      const frac = N > 1 ? (((value % N) + N) % N) / (N - 1) : 0.5;
      agujaVal.setValue(Math.max(0, Math.min(1, frac)));
    });
    updatePositions(0);
    return () => dragAnim.removeListener(id);
  }, [N, pizzas]);

  const agujaRot = agujaVal.interpolate({
    inputRange:  [0, 0.5, 1],
    outputRange: ['-75deg', '0deg', '75deg'],
  });

  // Snap suave con spring lento
  const doSnap = (rawTarget, vel = 0) => {
    const target = Math.round(rawTarget + vel * 0.12);
    snapRef.current = target;
    const idx = ((target % N) + N) % N;
    setSnapIdx(idx);
    Haptics.selectionAsync().catch(() => {});
    if (springRef.current) springRef.current.stop();
    springRef.current = Animated.spring(dragAnim, {
      toValue:   target,
      velocity:  vel,
      tension:   38,   // bajo = suave y lento
      friction:  13,   // alto = sin rebote
      useNativeDriver: false,
    });
    springRef.current.start();
  };

  // Auto-avance lento
  const resetAuto = () => {
    clearInterval(autoRef.current);
    if (N <= 1) return;
    autoRef.current = setInterval(() => {
      const next = snapRef.current + 1;
      snapRef.current = next;
      setSnapIdx(((next % N) + N) % N);
      if (springRef.current) springRef.current.stop();
      springRef.current = Animated.spring(dragAnim, {
        toValue: next, tension: 30, friction: 14, useNativeDriver: false,
      });
      springRef.current.start();
    }, 3800);
  };

  useEffect(() => {
    resetAuto();
    return () => clearInterval(autoRef.current);
  }, [N]);

  // PanResponder: movimiento de ruleta con el dedo
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.3,

    onPanResponderGrant: () => {
      clearInterval(autoRef.current);
      if (springRef.current) springRef.current.stop();
      startRef.current = rawRef.current;
    },

    // Ruleta sigue al dedo suavemente
    onPanResponderMove: (_, gs) => {
      dragAnim.setValue(startRef.current - gs.dx / SENS);
    },

    // Momentum al soltar: spring con velocidad del swipe
    onPanResponderRelease: (_, gs) => {
      const raw = startRef.current - gs.dx / SENS;
      const vel = -gs.vx / SENS;
      doSnap(raw, vel);
      resetAuto();
    },

    onPanResponderTerminate: () => {
      doSnap(rawRef.current);
      resetAuto();
    },
  })).current;

  if (pizzas.length === 0) return null;

  // Orden de render: las que están más al fondo primero
  const renderOrder = pizzas
    .map((p, i) => {
      let slot = ((i - snapIdx) % N + N) % N;
      if (slot > N / 2) slot -= N;
      return { p, i, absSlot: Math.abs(slot) };
    })
    .sort((a, b) => b.absSlot - a.absSlot);

  // Gauge
  const GR = 40; const GW = GR * 2 + 22; const GH = GR + 10;
  const GCX = GW / 2; const GCY = GH;
  const AGJ_L = GR - 4; const AGJ_W = 22;
  const toR2  = d => d * Math.PI / 180;
  const arcD    = `M ${GCX - GR} ${GCY} A ${GR} ${GR} 0 0 1 ${GCX + GR} ${GCY}`;
  const sectorD = `M ${GCX} ${GCY} L ${GCX - GR} ${GCY} A ${GR} ${GR} 0 0 1 ${GCX + GR} ${GCY} Z`;
  const TICKS   = [180, 210, 240, 270, 300, 330, 360];

  return (
    <View
      style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 4 }}
      {...pan.panHandlers}
    >
      {/* ── ABANICO EN ARCO ── */}
      <View style={{ width: ANCHO, height: H_ARC, overflow: 'hidden' }}>
        {renderOrder.map(({ p: pizza, i }) => {
          const a = animsRef.current[i];
          if (!a) return null;
          let slot = ((i - snapIdx) % N + N) % N;
          if (slot > N / 2) slot -= N;
          const esFrente = Math.abs(slot) < 0.5;

          return (
            <Animated.View
              key={pizza.id}
              style={{
                position: 'absolute',
                left: CX - BASE_SZ / 2,
                top: 8,
                width: BASE_SZ,
                alignItems: 'center',
                opacity: a.op,
                transform: [{ translateX: a.tx }, { translateY: a.ty }, { scale: a.sc }],
              }}
            >
              <Pressable
                onPress={() => {
                  if (esFrente) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    onPresionar(pizza);
                  } else {
                    const target = snapRef.current + slot;
                    doSnap(target);
                    resetAuto();
                  }
                }}
                style={{ alignItems: 'center' }}
              >
                {/* Círculo con imagen */}
                <View style={{
                  width: BASE_SZ, height: BASE_SZ, borderRadius: BASE_SZ / 2,
                  overflow: 'hidden',
                  borderWidth: esFrente ? 3 : 2,
                  borderColor: esFrente ? MARCA_COLOR : 'rgba(227,30,36,0.25)',
                  shadowColor: MARCA_COLOR,
                  shadowOffset: { width: 0, height: esFrente ? 8 : 2 },
                  shadowOpacity: esFrente ? 0.52 : 0.10,
                  shadowRadius: esFrente ? 12 : 3,
                  elevation: esFrente ? 10 : 2,
                }}>
                  <Image
                    source={{ uri: pizza.imagen }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </View>

                {/* Nombre */}
                <Text numberOfLines={1} style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: esFrente ? 11 : 9,
                  color: esFrente ? '#FFFFFF' : 'rgba(150,150,150,0.85)',
                  marginTop: 5,
                  maxWidth: BASE_SZ + 20,
                  textAlign: 'center',
                }}>
                  {pizza.nombre}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* ── VELOCÍMETRO PEQUEÑO — aguja apunta a la pizza activa ── */}
      <View style={{ width: GW, height: GH, marginTop: 12 }}>
        <Svg width={GW} height={GH} viewBox={`0 0 ${GW} ${GH}`}>
          <Path d={sectorD} fill="rgba(227,30,36,0.07)" />
          <Path d={arcD}    fill="none" stroke={MARCA_COLOR} strokeWidth={2.4} />
          {TICKS.map(deg => {
            const rad = toR2(deg); const c = deg === 270;
            const r1  = GR - 5;   const r2 = GR + (c ? 11 : 5);
            return (
              <Path key={deg}
                d={`M ${(GCX + r1 * Math.cos(rad)).toFixed(1)} ${(GCY + r1 * Math.sin(rad)).toFixed(1)} L ${(GCX + r2 * Math.cos(rad)).toFixed(1)} ${(GCY + r2 * Math.sin(rad)).toFixed(1)}`}
                stroke={MARCA_COLOR} strokeWidth={c ? 2.4 : 1.2} opacity={0.9}
              />
            );
          })}
        </Svg>

        {/* Rebanada apunta a la pizza activa */}
        <Animated.View style={{
          position: 'absolute', bottom: 0, left: GCX - AGJ_W / 2,
          width: AGJ_W, height: AGJ_L,
          transform: [
            { translateY:  AGJ_L / 2 },
            { rotate: agujaRot },
            { translateY: -(AGJ_L / 2) },
          ],
        }}>
          <PizzaSliceNeedle largo={AGJ_L} ancho={AGJ_W} />
        </Animated.View>

        {/* Pivote dorado */}
        <View style={{
          position: 'absolute', bottom: -5, left: GCX - 5.5,
          width: 11, height: 11, borderRadius: 5.5,
          backgroundColor: QUESO, borderWidth: 2, borderColor: QUESO_OSCURO,
        }} />
      </View>

      {/* Píldora con nombre */}
      <View style={[styles.pillFrontal, { marginTop: 10 }]}>
        <Text numberOfLines={1} style={styles.nombreFrontal}>
          {pizzas[snapIdx]?.nombre}
        </Text>
      </View>
    </View>
  );
}

// ─── PANTALLA PRINCIPAL ──────────────────────────────────────

export default function ProductoDetalleScreen({ route, navigation }) {
  const { tema, modoOscuro } = useTema();
  const { productos, sucursales = [], tamanos = [] } = useDatos();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const producto = productos.find((p) => p.id === route.params?.id);

  const [tamanoSel, setTamanoSel] = useState(null);
  const [mostrarRelacionados, setMostrarRelacionados] = useState(false);
  const [posiciones, setPosiciones] = useState({});
  const [proporcion, setProporcion] = useState(
    () => (producto && proporcionesConocidas.get(producto.imagen)) ?? PROPORCION_INICIAL
  );
  const [pendiente, setPendiente] = useState(null);

  const scrollY        = useRef(new Animated.Value(0)).current;
  const entrada        = useRef(new Animated.Value(0)).current;
  const precioEscala   = useRef(new Animated.Value(1)).current;
  const relAparicion   = useRef(new Animated.Value(0)).current;
  const destelloFoto   = useRef(new Animated.Value(0)).current;
  const brilloBoton    = useRef(new Animated.Value(0)).current;
  const indicadorY     = useRef(new Animated.Value(0)).current;
  const indicadorOp    = useRef(new Animated.Value(0)).current;
  const indicadorListo = useRef(false);

  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 1100, easing: SUAVE, useNativeDriver: true }).start();
    const destellos = Animated.sequence([
      Animated.delay(700),
      Animated.loop(Animated.sequence([
        Animated.timing(destelloFoto, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(3800),
      ])),
    ]);
    const brillos = Animated.sequence([
      Animated.delay(1400),
      Animated.loop(Animated.sequence([
        Animated.timing(brilloBoton, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(2600),
      ])),
    ]);
    destellos.start(); brillos.start();
    return () => { destellos.stop(); brillos.stop(); };
  }, []);

  useEffect(() => {
    const quitar = navigation.addListener('transitionEnd', (e) => {
      if (!e.data?.closing) setMostrarRelacionados(true);
    });
    const t = setTimeout(() => setMostrarRelacionados(true), 700);
    return () => { quitar(); clearTimeout(t); };
  }, [navigation]);

  useEffect(() => {
    if (!mostrarRelacionados) return;
    Animated.timing(relAparicion, { toValue: 1, duration: 900, easing: SUAVE, useNativeDriver: true }).start();
  }, [mostrarRelacionados]);

  useEffect(() => {
    if (tamanoSel === null) return;
    precioEscala.setValue(0.85);
    Animated.spring(precioEscala, { toValue: 1, speed: 20, bounciness: 14, useNativeDriver: true }).start();
  }, [tamanoSel]);

  useEffect(() => {
    if (tamanoSel === null) return;
    const p = posiciones[tamanoSel];
    if (!p) return;
    if (!indicadorListo.current) {
      indicadorY.setValue(p.y); indicadorListo.current = true;
      Animated.timing(indicadorOp, { toValue: 1, duration: 250, easing: SUAVE, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(indicadorY, { toValue: p.y, speed: 16, bounciness: 9, useNativeDriver: true }).start();
  }, [tamanoSel, posiciones]);

  if (!producto) {
    return (
      <View style={[styles.noEncontrado, { backgroundColor: tema.fondo }]}>
        <IconoCategoria tipo="Pizzas" size={56} grosor={1.4} />
        <Text style={[styles.noEncontradoTexto, { color: tema.texto }]}>Este producto ya no está disponible</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.volverTexto, { color: tema.precio }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const esPizza        = producto.categoria === 'Pizzas';
  const tamanosBase    = esPizza ? [...tamanos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) : [];
  // Si el producto trae sus propios precios (columna "precios"), se usan en lugar de los de la tabla "tamanos"
  const preciosPropios = Array.isArray(producto.precios) && producto.precios.length > 0 ? producto.precios : null;
  const listaTamanos   = preciosPropios
    ? tamanosBase.map((t, i) => ({ ...t, precio: preciosPropios[i] ?? t.precio }))
    : tamanosBase;
  const tamano         = tamanoSel !== null ? listaTamanos[tamanoSel] || null : null;
  const precioMostrado = tamano ? tamano.precio : (preciosPropios ? preciosPropios[0] : producto.precio);
  const mostrarDesde   = !tamano && (producto.precioDesde || listaTamanos.length > 0);
  const textoPrecio    = `${mostrarDesde ? 'desde ' : ''}$${precioMostrado}`;
  const nombreConTamano = tamano ? `${producto.nombre} (${tamano.nombre})` : producto.nombre;

  const relacionados = productos
    .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
    .slice(0, MAX_RELACIONADOS);

  const anchoFoto = width - 32;
  const altoFoto  = anchoFoto / proporcion;

  const alCargarFoto = (e) => {
    const ancho = e?.source?.width; const alto = e?.source?.height;
    if (!ancho || !alto) return;
    const nueva = Math.max(ancho / alto, PROPORCION_MINIMA);
    proporcionesConocidas.set(producto.imagen, nueva);
    setProporcion(nueva);
  };

  const guardarPosicion = (i, layout) =>
    setPosiciones((prev) =>
      prev[i] && prev[i].y === layout.y && prev[i].height === layout.height
        ? prev : { ...prev, [i]: { y: layout.y, height: layout.height } }
    );

  const fotoEscalaScroll   = scrollY.interpolate({ inputRange: [-200, 0, altoFoto], outputRange: [1.12, 1, 0.9], extrapolate: 'clamp' });
  const fotoOpacidadScroll = scrollY.interpolate({ inputRange: [0, altoFoto], outputRange: [1, 0.25], extrapolate: 'clamp' });
  const barraFondo         = scrollY.interpolate({ inputRange: [0, altoFoto * 0.6], outputRange: [0, 1], extrapolate: 'clamp' });
  const tituloOpacidad     = scrollY.interpolate({ inputRange: [altoFoto + 20, altoFoto + 70], outputRange: [0, 1], extrapolate: 'clamp' });
  const tituloY            = scrollY.interpolate({ inputRange: [altoFoto + 20, altoFoto + 70], outputRange: [8, 0], extrapolate: 'clamp' });

  const aparecer = (i) => {
    const ini = i * 0.08;
    return {
      opacity:   entrada.interpolate({ inputRange: [ini, ini + 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ translateY: entrada.interpolate({ inputRange: [ini, ini + 0.5], outputRange: [24, 0], extrapolate: 'clamp' }) }],
    };
  };
  const fotoEntradaEscala   = entrada.interpolate({ inputRange: [0, 0.5], outputRange: [0.94, 1], extrapolate: 'clamp' });
  const fotoEntradaOpacidad = entrada.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' });
  const footerY             = entrada.interpolate({ inputRange: [0.15, 0.6], outputRange: [120, 0], extrapolate: 'clamp' });
  const destelloX           = destelloFoto.interpolate({ inputRange: [0, 1], outputRange: [-180, anchoFoto + 80] });
  const brilloBotonX        = brilloBoton.interpolate({ inputRange: [0, 1], outputRange: [-120, width] });

  const elegirTamano = (i) => {
    if (i === tamanoSel) return;
    Haptics.selectionAsync().catch(() => {});
    setTamanoSel(i);
  };

  const conSucursal = (titulo, hacer) => {
    if (sucursales.length <= 1) { hacer(sucursales[0]); return; }
    setPendiente({ titulo, hacer });
  };

  const abrirWhatsApp = async (sucursal) => {
    if (!sucursal?.whatsapp) { Alert.alert('Ups', 'Esta sucursal no tiene WhatsApp registrado.'); return; }
    const mensaje = `${MARCA.saludoWhatsApp} Quiero información sobre "${nombreConTamano}" (${textoPrecio}).`;
    try { await Linking.openURL(`https://wa.me/${sucursal.whatsapp}?text=${encodeURIComponent(mensaje)}`); }
    catch { Alert.alert('Ups', 'No se pudo abrir WhatsApp.'); }
  };

  const abrirLlamada = async (sucursal) => {
    if (!sucursal?.telefono) { Alert.alert('Ups', 'Esta sucursal no tiene teléfono registrado.'); return; }
    try { await Linking.openURL(`tel:${sucursal.telefono}`); }
    catch { Alert.alert('Ups', 'No se pudo abrir el marcador.'); }
  };

  const preguntar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    conSucursal('¿A qué sucursal le escribimos?', abrirWhatsApp);
  };

  const llamar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    conSucursal('¿A qué sucursal llamamos?', abrirLlamada);
  };

  const compartir = () => {
    const unica = sucursales.length === 1 ? sucursales[0] : null;
    const comoPedir = unica ? `Pide al ${unica.telefonoFormato || unica.telefono}` : `Pide en tu sucursal ${MARCA.nombre} más cercana`;
    Share.share({ message: `${nombreConTamano} en ${MARCA.nombre}, ${textoPrecio}\n${producto.descripcion}\n\n${comoPedir}` }).catch(() => {});
  };

  const bordeSuave      = modoOscuro ? '#2C2C2C' : '#EEEEEE';
  const fondoAviso      = modoOscuro ? '#2A1A1A' : '#FDECEC';
  const colorAvisoTexto = modoOscuro ? '#F2A5A5' : '#9B1C1C';
  const fondoChip       = modoOscuro ? '#242424' : '#F4F4F4';
  const fondoFooter     = modoOscuro ? '#1A1A1A' : '#FFFFFF';
  const fondoTabla      = modoOscuro ? '#2A2420' : CREMA;
  const posActual       = tamanoSel !== null ? posiciones[tamanoSel] : null;

  return (
    <View style={[styles.contenedor, { backgroundColor: tema.fondo }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingTop: insets.top + ALTO_BARRA + 4, paddingBottom: insets.bottom + 110 }}
      >
        <Animated.View style={[styles.fotoTarjeta, {
          width: anchoFoto, height: altoFoto,
          opacity: Animated.multiply(fotoEntradaOpacidad, fotoOpacidadScroll),
          transform: [{ scale: Animated.multiply(fotoEntradaEscala, fotoEscalaScroll) }],
        }]}>
          <Image source={{ uri: producto.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" onLoad={alCargarFoto} />
          <Animated.View pointerEvents="none" style={[styles.destello, { transform: [{ translateX: destelloX }, { rotate: '18deg' }] }]}>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View pointerEvents="none" style={styles.fotoBorde} />
        </Animated.View>

        <View style={styles.info}>
          <Animated.View style={[styles.etiquetasFila, aparecer(1)]}>
            <View style={[styles.chip, { backgroundColor: fondoChip }]}>
              <IconoCategoria tipo={producto.categoria} />
              <Text style={[styles.chipTexto, { color: tema.texto }]}>{producto.categoria}</Text>
            </View>
            {producto.subcategoria ? (
              <View style={[styles.chip, { backgroundColor: fondoChip }]}>
                <IconoCategoria subcategoria />
                <Text style={[styles.chipTexto, { color: tema.texto }]}>{producto.subcategoria}</Text>
              </View>
            ) : null}
            {producto.oferta && (
              <View style={styles.badgeOferta}>
                <IconoLlama />
                <Text style={styles.badgeOfertaTexto}>OFERTA ESPECIAL</Text>
              </View>
            )}
          </Animated.View>

          <Animated.Text style={[styles.nombre, { color: tema.texto }, aparecer(2)]}>{producto.nombre}</Animated.Text>

          <Animated.View style={aparecer(3)}>
            <Animated.View style={[styles.precioRow, { transform: [{ scale: precioEscala }] }]}>
              {mostrarDesde && <Text style={[styles.desde, { color: tema.textoSecundario }]}>Desde</Text>}
              <Text style={[styles.precio, { color: tema.precio }]}>${precioMostrado}</Text>
              <Text style={[styles.moneda, { color: tema.textoSecundario }]}>MXN{tamano ? ` · ${tamano.nombre}` : ''}</Text>
            </Animated.View>
          </Animated.View>

          <Animated.View style={aparecer(4)}>
            <LinearGradient colors={['rgba(227,30,36,0)', 'rgba(227,30,36,0.45)', 'rgba(227,30,36,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.linea} />
            <Etiqueta texto="DESCRIPCIÓN" />
            <Text style={[styles.descripcion, { color: tema.textoSecundario }]}>{producto.descripcion}</Text>
          </Animated.View>

          {listaTamanos.length > 0 && (
            <Animated.View style={aparecer(5)}>
              <Etiqueta texto="TAMAÑOS" style={{ marginTop: 22 }} />
              <View style={[styles.tabla, { borderColor: 'rgba(201,162,75,0.6)', backgroundColor: fondoTabla }]}>
                {posActual && (
                  <Animated.View pointerEvents="none" style={[styles.indicador, { height: posActual.height, opacity: indicadorOp, transform: [{ translateY: indicadorY }] }]}>
                    <LinearGradient colors={['rgba(227,30,36,0.16)', 'rgba(227,30,36,0.03)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={[MARCA_CLARO, MARCA_COLOR, MARCA_OSCURO]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.indicadorBarra} />
                  </Animated.View>
                )}
                {listaTamanos.map((t, i) => (
                  <FilaTamano key={t.id ?? t.nombre} t={t} activo={i === tamanoSel} primera={i === 0}
                    onPress={() => elegirTamano(i)} onLayout={(e) => guardarPosicion(i, e.nativeEvent.layout)}
                    modoOscuro={modoOscuro} />
                ))}
                <View pointerEvents="none" style={styles.franjaTabla} />
              </View>
            </Animated.View>
          )}

          <Animated.View style={aparecer(6)}>
            <View style={[styles.aviso, { backgroundColor: fondoAviso }]}>
              <MedallonInfo />
              <Text style={[styles.avisoTexto, { color: colorAvisoTexto }]}>
                Precios informativos. Haz tu pedido directo en sucursal, por teléfono o WhatsApp.
              </Text>
            </View>
          </Animated.View>

          {mostrarRelacionados && relacionados.length > 0 && (
            <Animated.View style={[styles.seccionCarrusel, { opacity: relAparicion }]}>
              <View style={[styles.cajaTambienTeGusta, { backgroundColor: modoOscuro ? '#1A1A1A' : '#FFF5F5' }]}>
                <View style={styles.seccionHeader}>
                  <Text style={[styles.seccionTitulo, { color: modoOscuro ? '#FFFFFF' : tema.texto }]}>TAMBIÉN TE PUEDE GUSTAR</Text>
                  <LinearGradient colors={[MARCA_COLOR, 'rgba(227,30,36,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.lineaMarca} />
                </View>
                <CarruselGiratorio
                  pizzas={relacionados}
                  onPresionar={(p) => navigation.push('ProductoDetalle', { id: p.id })}
                />
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      <View style={[styles.barra, { paddingTop: insets.top, height: insets.top + ALTO_BARRA }]} pointerEvents="box-none">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: barraFondo }]}>
          {ES_ANDROID ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tema.header }]} /> : <BlurView intensity={60} tint={modoOscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
          <View style={[styles.barraBorde, { backgroundColor: bordeSuave }]} />
        </Animated.View>
        <View style={styles.barraFila} pointerEvents="box-none">
          <Pressable style={({ pressed }) => [styles.botonCircular, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]} onPress={() => navigation.goBack()}>
            <IconoAtras color="#1A1A1A" />
          </Pressable>
          <Animated.Text numberOfLines={1} style={[styles.barraTitulo, { color: tema.texto, opacity: tituloOpacidad, transform: [{ translateY: tituloY }] }]}>
            {producto.nombre}
          </Animated.Text>
          <View style={styles.botonesDerecha}>
            <BotonFavorito id={producto.id} size={42} />
            <Pressable style={({ pressed }) => [styles.botonCircular, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]} onPress={compartir}>
              <IconoCompartir color="#1A1A1A" />
            </Pressable>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.footer, {
        backgroundColor: fondoFooter,
        paddingBottom: insets.bottom + 12,
        borderTopColor: bordeSuave,
        transform: [{ translateY: footerY }],
      }]}>
        <Pressable style={({ pressed }) => [styles.botonLlamar, { borderColor: modoOscuro ? '#3A3A3A' : '#E0E0E0' }, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]} onPress={llamar}>
          <IconoTelefono color={tema.texto} size={21} />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.botonWhats, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]} onPress={preguntar}>
          <LinearGradient colors={['#2EE070', '#25D366', '#1AAE52']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[styles.brilloBoton, { transform: [{ translateX: brilloBotonX }, { rotate: '20deg' }] }]}>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <IconoChat color="#FFFFFF" size={20} />
          <Text style={styles.botonWhatsTexto}>Preguntar por WhatsApp</Text>
        </Pressable>
      </Animated.View>

      <ElegirSucursal
        visible={!!pendiente} titulo={pendiente?.titulo} sucursales={sucursales}
        onCerrar={() => setPendiente(null)}
        onElegir={(s) => { const accion = pendiente; setPendiente(null); accion?.hacer(s); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  fotoTarjeta: { alignSelf: 'center', borderRadius: 24, overflow: 'hidden', backgroundColor: '#1E1E1E' },
  fotoBorde: { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  destello: { position: 'absolute', top: -80, bottom: -80, left: 0, width: 110 },
  barra: { position: 'absolute', top: 0, left: 0, right: 0 },
  barraBorde: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  barraFila: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  barraTitulo: { flex: 1, textAlign: 'center', fontFamily: FUENTE_TITULOS, fontSize: 18 },
  botonesDerecha: { flexDirection: 'row', gap: 10 },
  botonCircular: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  info: { paddingHorizontal: 20, paddingTop: 18 },
  etiquetasFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: MARCA_COLOR, backgroundColor: 'rgba(227,30,36,0.12)' },
  chipTexto: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: MARCA_CLARO },
  badgeOferta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1, borderColor: MARCA_COLOR },
  badgeOfertaTexto: { fontFamily: 'Poppins_700Bold', fontSize: 10, color: MARCA_CLARO, letterSpacing: 1 },
  nombre: { fontFamily: FUENTE_TITULOS, fontSize: 30, lineHeight: 36, letterSpacing: 0.3 },
  precioRow: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'flex-start', gap: 6, marginTop: 4 },
  desde: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  precio: { fontFamily: FUENTE_TITULOS, fontSize: 38 },
  moneda: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  linea: { height: 1, marginVertical: 18 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diamante: { width: 7, height: 7, transform: [{ rotate: '45deg' }], borderRadius: 1 },
  etiqueta: { fontFamily: FUENTE_TITULOS, fontSize: 13, letterSpacing: 1.5 },
  descripcion: { fontFamily: 'Poppins_400Regular', fontSize: 15, lineHeight: 23, marginTop: 6 },
  tabla: { borderWidth: 1.2, borderRadius: 16, overflow: 'hidden', marginTop: 10 },
  franjaTabla: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: MARCA_COLOR },
  indicador: { position: 'absolute', top: 0, left: 0, right: 0 },
  indicadorBarra: { position: 'absolute', top: 8, bottom: 8, left: 0, width: 3, borderRadius: 2 },
  filaTamano: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  tamanoCaja: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  radioAro: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.6, borderColor: DORADO, alignItems: 'center', justifyContent: 'center' },
  radioPunto: { width: 13, height: 13, borderRadius: 7, backgroundColor: MARCA_COLOR },
  tamanoNombre: { fontFamily: FUENTE_TITULOS, fontSize: 17, letterSpacing: 0.3 },
  tamanoRebanadas: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: -2 },
  tamanoPrecio: { fontFamily: FUENTE_TITULOS, fontSize: 22 },
  aviso: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, marginTop: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(227,30,36,0.15)' },
  avisoTexto: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17 },
  seccionCarrusel: { marginTop: 28 },
  cajaTambienTeGusta: { borderRadius: 24, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14, borderWidth: 1, borderColor: 'rgba(227,30,36,0.2)' },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  seccionTitulo: { fontFamily: FUENTE_TITULOS, fontSize: 14, letterSpacing: 1 },
  lineaMarca: { flex: 1, height: 2, marginLeft: 10, borderRadius: 2 },
  pillFrontal: { alignSelf: 'center', backgroundColor: MARCA_COLOR, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 8, maxWidth: 220 },
  nombreFrontal: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.5 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  botonLlamar: { width: 54, height: 54, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  botonWhats: { flex: 1, flexDirection: 'row', gap: 8, borderRadius: 16, height: 54, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  brilloBoton: { position: 'absolute', top: -30, bottom: -30, left: 0, width: 70 },
  botonWhatsTexto: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 14 },
  noEncontrado: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  noEncontradoTexto: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, textAlign: 'center' },
  volverTexto: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginTop: 8 },
});