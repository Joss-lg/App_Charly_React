// src/components/TarjetaTamano.js
// Tarjeta de un tamaño de pizza (Chica, Mediana, Grande, Familiar).
// Modo claro: tarjeta crema con franja roja arriba, borde dorado, medallón, anillo y ondas.
// Modo oscuro: tarjeta gris como el resto de la app, pizza de línea roja
// y el precio dentro de una franja roja abajo.
// Animaciones: entra subiendo con rebote (una tras otra), la pizza gira despacio sola.
// Al elegirla: se levanta y el precio salta con rebote
// (en modo claro además: medallón latiendo, anillo punteado y ondas rojas).
// Al tocarla: se hunde, la pizza da un brinquito y una vuelta.
// Detalle escondido: 7 toques seguidos voltean la pizza como moneda
// y aparece el logo de la pizzería; después regresa sola.

import { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';

const LADO_MIN = 38; // Chica
const PASO = 6; // cuánto crece por cada tamaño
const ALTO_CAJA = 72; // caja fija para que los textos queden alineados
const ANCHO_CAJA = 80;
const EXTRA_MEDALLON = 10; // cuánto sobresale el medallón (modo claro)
const EXTRA_ANILLO = 8; // cuánto sobresale el anillo punteado (modo claro)
const NUM_ONDAS = 2; // ondas rojas que salen de la pizza (modo claro)

// Detalle escondido
const TOQUES_PARA_LOGO = 7;
const TIEMPO_ENTRE_TOQUES = 2000;
const TIEMPO_LOGO = 1500;

const LOGO = require('../../assets/charly-logo.png');
const DEGRADADO_ARO = [COLORES.primarioClaro, COLORES.primario, COLORES.primarioOscuro];
const FUENTE_TITULOS = 'LilitaOne_400Regular';

const DORADO = '#C9A24B';
const CREMA = '#F8F2E6';
const CAFE = '#2A1F14';
const BORDE_OSCURO = '#2C2C2C';

// Puntitos de orégano (dibujo de 100 x 100)
const OREGANO = [
  [38, 34], [62, 36], [30, 54], [70, 56], [42, 70], [60, 72], [50, 28], [50, 76], [34, 44], [66, 46],
];

// Pizza completa dibujada en línea
function PizzaCompleta({ lado, nivel, oscuro }) {
  const cortes = 6 + nivel * 2;
  const cantidad = 3 + nivel;
  const centro = nivel >= 2;

  const colorCorte = oscuro ? 'rgba(242,242,242,0.45)' : DORADO;
  const colorAnillo = oscuro ? COLORES.primarioClaro : DORADO;

  const lineas = [];
  for (let i = 0; i < cortes; i += 1) {
    const a = ((360 / cortes) * i + 12) * (Math.PI / 180);
    lineas.push(
      <Line
        key={i}
        x1={50}
        y1={50}
        x2={50 + 36 * Math.cos(a)}
        y2={50 + 36 * Math.sin(a)}
        stroke={colorCorte}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    );
  }

  const circulos = [];
  for (let i = 0; i < cantidad; i += 1) {
    const a = ((360 / cantidad) * i + 20) * (Math.PI / 180);
    circulos.push([50 + 21 * Math.cos(a), 50 + 21 * Math.sin(a), 6.2]);
  }
  if (centro) circulos.push([50, 50, 5.6]);

  return (
    <Svg width={lado} height={lado} viewBox="0 0 100 100">
      {!oscuro && <Circle cx={50} cy={50} r={38} fill="rgba(227,30,36,0.1)" />}
      <Circle cx={50} cy={50} r={43} fill="none" stroke={COLORES.primario} strokeWidth={8} />
      {!oscuro && (
        <Path
          d="M20 30 Q30 18 46 13"
          fill="none"
          stroke="rgba(255,226,160,0.85)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
      <Circle
        cx={50}
        cy={50}
        r={37}
        fill="none"
        stroke={colorAnillo}
        strokeWidth={oscuro ? 0.8 : 1.1}
      />
      {lineas}
      {!oscuro &&
        OREGANO.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={0.9} fill={DORADO} />
        ))}
      {circulos.map(([x, y, r], i) => (
        <Circle
          key={`c${i}`}
          cx={x}
          cy={y}
          r={r}
          fill={oscuro ? COLORES.primario : 'rgba(227,30,36,0.22)'}
          stroke={oscuro ? COLORES.primarioClaro : COLORES.primario}
          strokeWidth={oscuro ? 1.4 : 2}
        />
      ))}
      {circulos.map(([x, y, r], i) => (
        <Circle key={`b${i}`} cx={x - r * 0.3} cy={y - r * 0.35} r={1.1} fill="rgba(255,255,255,0.7)" />
      ))}
    </Svg>
  );
}

function TarjetaTamano({ tamano, nivel = 0, activo = false, onElegir }) {
  const { tema, modoOscuro } = useTema();
  const presion = useRef(new Animated.Value(1)).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const vuelta = useRef(new Animated.Value(0)).current;
  const volteo = useRef(new Animated.Value(0)).current; // 0 = pizza, 1 = logo
  const vueltas = useRef(0);

  // Animaciones de entrada y de la tarjeta elegida
  const entrada = useRef(new Animated.Value(0)).current; // aparece al cargar
  const ocioso = useRef(new Animated.Value(0)).current; // giro lento de la pizza
  const elevado = useRef(new Animated.Value(0)).current; // 1 = tarjeta elegida (levantada)
  const latido = useRef(new Animated.Value(0)).current; // medallón latiendo (modo claro)
  const anillo = useRef(new Animated.Value(0)).current; // giro del anillo punteado (modo claro)
  const precioPop = useRef(new Animated.Value(1)).current; // rebote del precio
  const ondas = useRef(Array.from({ length: NUM_ONDAS }, () => new Animated.Value(0))).current;
  const animLatido = useRef(null);

  // Contador de toques para el detalle escondido
  const toques = useRef(0);
  const ultimoToque = useRef(0);
  const mostrandoLogo = useRef(false);

  const lado = LADO_MIN + nivel * PASO;
  const medallon = lado + EXTRA_MEDALLON;
  const ladoAnillo = medallon + EXTRA_ANILLO;

  const fondoTarjeta = modoOscuro ? tema.card : CREMA;
  const colorNombre = modoOscuro ? '#F2F2F2' : CAFE;
  const colorSecundario = modoOscuro ? tema.textoSecundario : '#7A6A55';
  const colorPrecio = COLORES.primario;
  const colorBorde = activo
    ? COLORES.primario
    : modoOscuro
      ? BORDE_OSCURO
      : 'rgba(201,162,75,0.6)';

  // Brillo rojo alrededor de la tarjeta elegida (solo modo oscuro)
  const brilloElegida =
    activo && modoOscuro
      ? { shadowColor: COLORES.primario, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 }
      : null;

  // Entrada: sube con rebote, una tarjeta tras otra
  useEffect(() => {
    const animacion = Animated.sequence([
      Animated.delay(nivel * 110),
      Animated.spring(entrada, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, []);

  // Giro lento de la pizza, cada tamaño a su ritmo
  useEffect(() => {
    const giro = Animated.loop(
      Animated.timing(ocioso, {
        toValue: 1,
        duration: 24000 + nivel * 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    giro.start();
    return () => giro.stop();
  }, []);

  // Tarjeta elegida: se levanta y el medallón late
  useEffect(() => {
    Animated.spring(elevado, {
      toValue: activo ? 1 : 0,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();

    if (animLatido.current) animLatido.current.stop();
    if (activo) {
      animLatido.current = Animated.loop(
        Animated.sequence([
          Animated.timing(latido, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(latido, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      animLatido.current.start();
    } else {
      animLatido.current = null;
      Animated.timing(latido, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
    return () => {
      if (animLatido.current) animLatido.current.stop();
    };
  }, [activo]);

  // Tarjeta elegida: anillo punteado girando, ondas rojas y rebote del precio
  useEffect(() => {
    if (!activo) {
      anillo.setValue(0);
      ondas.forEach((o) => o.setValue(0));
      precioPop.setValue(1);
      return undefined;
    }

    // Rebote del precio
    precioPop.setValue(0.7);
    Animated.spring(precioPop, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }).start();

    // El anillo y las ondas solo se ven en modo claro
    if (modoOscuro) return undefined;

    // Anillo dando vueltas
    const giroAnillo = Animated.loop(
      Animated.timing(anillo, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    giroAnillo.start();

    // Ondas rojas: una sale, y la siguiente sale después
    const lasOndas = ondas.map((o, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 900),
          Animated.timing(o, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    lasOndas.forEach((o) => o.start());

    return () => {
      giroAnillo.stop();
      lasOndas.forEach((o) => o.stop());
    };
  }, [activo, modoOscuro]);

  const alPresionar = () => {
    Animated.spring(presion, { toValue: 0.95, friction: 6, tension: 200, useNativeDriver: true }).start();
  };
  const alSoltar = () => {
    Animated.spring(presion, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  };

  // La pizza se voltea como moneda, aparece el logo y luego regresa
  const mostrarLogo = () => {
    mostrandoLogo.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    volteo.setValue(0);
    Animated.sequence([
      Animated.timing(volteo, {
        toValue: 1,
        duration: 480,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(TIEMPO_LOGO),
      Animated.timing(volteo, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      mostrandoLogo.current = false;
    });
  };

  const alTocar = () => {
    if (mostrandoLogo.current) return;

    // Marca este tamaño como elegido (la pantalla muestra las pizzas de este tamaño)
    if (onElegir) onElegir(nivel);

    const ahora = Date.now();
    toques.current = ahora - ultimoToque.current < TIEMPO_ENTRE_TOQUES ? toques.current + 1 : 1;
    ultimoToque.current = ahora;

    if (toques.current >= TOQUES_PARA_LOGO) {
      toques.current = 0;
      mostrarLogo();
      return;
    }

    // Toque normal: brinquito y una vuelta
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    vueltas.current += 1;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(brinco, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(brinco, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
      Animated.timing(vuelta, {
        toValue: vueltas.current,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const subir = brinco.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const girar = vuelta.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const girarOcioso = ocioso.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const girarAnillo = anillo.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const sombraEscala = brinco.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  const entraY = entrada.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const entraEscala = entrada.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const levanta = elevado.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const latidoEscala = latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const latidoOpacidad = latido.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const llenaLinea = elevado.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] });

  // Volteo tipo moneda: la pizza se "aplasta" de lado y el logo se "desaplasta" en su lugar
  const pizzaAncho = volteo.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.01, 0.01],
    extrapolate: 'clamp',
  });
  const pizzaOpacidad = volteo.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const logoAncho = volteo.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.01, 0.01, 1],
    extrapolate: 'clamp',
  });
  const logoOpacidad = volteo.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });

  const ladoLogo = lado + 6;
  const textoRebanadas = tamano.rebanadas ? `${tamano.rebanadas} rebanadas, ` : '';

  return (
    <Pressable
      onPressIn={alPresionar}
      onPressOut={alSoltar}
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={`${tamano.nombre}, ${textoRebanadas}${tamano.precio} pesos`}
    >
      <Animated.View
        style={[
          styles.tarjeta,
          {
            backgroundColor: fondoTarjeta,
            borderColor: colorBorde,
            borderWidth: activo ? 2 : 1,
            paddingTop: modoOscuro ? 14 : 16,
            paddingBottom: modoOscuro ? 0 : 14,
            opacity: entrada,
            transform: [
              { translateY: entraY },
              { translateY: levanta },
              { scale: entraEscala },
              { scale: presion },
            ],
          },
          brilloElegida,
        ]}
      >
        {/* Modo claro: franja roja arriba */}
        {!modoOscuro && (
          <View
            style={[
              styles.franja,
              {
                borderTopLeftRadius: activo ? 14 : 15,
                borderTopRightRadius: activo ? 14 : 15,
              },
            ]}
          />
        )}

        <View style={styles.caja}>
          {/* Modo claro: ondas, anillo y medallón */}
          {!modoOscuro &&
            ondas.map((onda, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.onda,
                  {
                    width: medallon,
                    height: medallon,
                    borderRadius: medallon / 2,
                    left: (ANCHO_CAJA - medallon) / 2,
                    top: (ALTO_CAJA - medallon) / 2,
                    opacity: activo
                      ? onda.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
                      : 0,
                    transform: [
                      { scale: onda.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
                    ],
                  },
                ]}
              />
            ))}

          {!modoOscuro && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.anillo,
                {
                  width: ladoAnillo,
                  height: ladoAnillo,
                  borderRadius: ladoAnillo / 2,
                  left: (ANCHO_CAJA - ladoAnillo) / 2,
                  top: (ALTO_CAJA - ladoAnillo) / 2,
                  opacity: elevado,
                  transform: [{ rotate: girarAnillo }],
                },
              ]}
            />
          )}

          {!modoOscuro && (
            <Animated.View
              style={[
                styles.medallon,
                {
                  width: medallon,
                  height: medallon,
                  borderRadius: medallon / 2,
                  left: (ANCHO_CAJA - medallon) / 2,
                  top: (ALTO_CAJA - medallon) / 2,
                  backgroundColor: 'rgba(201,162,75,0.2)',
                  opacity: latidoOpacidad,
                  transform: [{ scale: latidoEscala }],
                },
              ]}
            />
          )}

          {/* Sombrita bajo la pizza (solo modo claro, no gira) */}
          {!modoOscuro && (
            <Animated.View
              style={[
                styles.sombra,
                {
                  width: lado * 0.7,
                  backgroundColor: 'rgba(120,70,20,0.12)',
                  transform: [{ scaleX: sombraEscala }],
                },
              ]}
            />
          )}

          {/* Cara 1: la pizza */}
          <Animated.View style={{ opacity: pizzaOpacidad, transform: [{ scaleX: pizzaAncho }] }}>
            <Animated.View
              style={{
                transform: [{ translateY: subir }, { rotate: girar }, { rotate: girarOcioso }],
              }}
            >
              <PizzaCompleta lado={lado} nivel={nivel} oscuro={modoOscuro} />
            </Animated.View>
          </Animated.View>

          {/* Cara 2: el logo (detalle escondido) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.caraLogo,
              { opacity: logoOpacidad, transform: [{ scaleX: logoAncho }] },
            ]}
          >
            <LinearGradient
              colors={DEGRADADO_ARO}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.aroLogo,
                { width: ladoLogo, height: ladoLogo, borderRadius: ladoLogo / 2 },
              ]}
            >
              <View
                style={[
                  styles.interiorLogo,
                  {
                    width: ladoLogo - 4,
                    height: ladoLogo - 4,
                    borderRadius: (ladoLogo - 4) / 2,
                  },
                ]}
              >
                <Image source={LOGO} style={styles.imagenLogo} contentFit="contain" />
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={[styles.nombre, { color: colorNombre }]}>{tamano.nombre}</Text>

        {/* Modo claro: línea dorada que se llena de rojo al elegir el tamaño */}
        {!modoOscuro && (
          <View style={styles.lineaDorada}>
            <Animated.View style={[styles.lineaRoja, { transform: [{ scaleX: llenaLinea }] }]} />
          </View>
        )}

        {tamano.rebanadas ? (
          <Text style={[styles.rebanadas, { color: colorSecundario }]}>
            {tamano.rebanadas} rebanadas
          </Text>
        ) : null}

        {modoOscuro ? (
          // Modo oscuro: el precio va dentro de una franja roja abajo
          <View style={styles.franjaPrecio}>
            <Animated.Text style={[styles.precioBanda, { transform: [{ scale: precioPop }] }]}>
              ${tamano.precio}
            </Animated.Text>
          </View>
        ) : (
          <Animated.Text
            style={[styles.precio, { color: colorPrecio, transform: [{ scale: precioPop }] }]}
          >
            ${tamano.precio}
          </Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// Solo se redibuja si cambia su tamaño, su lugar en la lista o si está elegida
export default memo(TarjetaTamano);

const styles = StyleSheet.create({
  tarjeta: {
    width: 104,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  franja: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: COLORES.primario,
  },
  caja: {
    height: ALTO_CAJA,
    width: ANCHO_CAJA,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  onda: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: COLORES.primario,
  },
  anillo: {
    position: 'absolute',
    borderWidth: 1.3,
    borderStyle: 'dashed',
    borderColor: DORADO,
  },
  medallon: {
    position: 'absolute',
  },
  sombra: {
    position: 'absolute',
    bottom: 0,
    height: 5,
    borderRadius: 3,
  },
  caraLogo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aroLogo: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interiorLogo: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  imagenLogo: {
    width: '100%',
    height: '100%',
  },
  nombre: {
    fontFamily: FUENTE_TITULOS,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  lineaDorada: {
    width: 28,
    height: 2,
    backgroundColor: DORADO,
    marginTop: 3,
    marginBottom: 2,
    overflow: 'hidden',
  },
  lineaRoja: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORES.primario,
  },
  rebanadas: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
  },
  precio: {
    fontFamily: FUENTE_TITULOS,
    fontSize: 22,
    marginTop: 2,
  },
  franjaPrecio: {
    alignSelf: 'stretch',
    marginTop: 8,
    paddingVertical: 5,
    alignItems: 'center',
    backgroundColor: COLORES.primario,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  precioBanda: {
    fontFamily: FUENTE_TITULOS,
    fontSize: 22,
    color: '#FFFFFF',
  },
});