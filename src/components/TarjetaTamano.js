// src/components/TarjetaTamano.js
// Tarjeta de un tamaño de pizza (Chica, Mediana, Grande, Familiar)
// con una pizza realista que crece según el tamaño.
// Al tocarla: la tarjeta se hunde, la pizza da un brinquito y media vuelta.
// Detalle escondido: 7 toques seguidos voltean la pizza como moneda
// y aparece el logo de la pizzería; después regresa sola a la pizza.

import { memo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import PizzaRealista from './PizzaRealista';
import { COLORES } from '../config/marca';

const LADO_MIN = 34; // Chica
const PASO = 8; // cuánto crece por cada tamaño
const ALTO_CAJA = 66; // caja fija para que los textos queden alineados

// Detalle escondido
const TOQUES_PARA_LOGO = 7; // cuántos toques seguidos hacen falta
const TIEMPO_ENTRE_TOQUES = 2000; // si pasan más de 2 s entre toques, la cuenta empieza de nuevo
const TIEMPO_LOGO = 1500; // cuánto se queda el logo en pantalla

const LOGO = require('../../assets/charly-logo.png');

// Aro del logo con los colores de la marca
const DEGRADADO_ARO = [COLORES.primarioClaro, COLORES.primario, COLORES.primarioOscuro];

function TarjetaTamano({ tamano, nivel = 0 }) {
  const { tema, modoOscuro } = useTema();
  const presion = useRef(new Animated.Value(1)).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const vuelta = useRef(new Animated.Value(0)).current;
  const volteo = useRef(new Animated.Value(0)).current; // 0 = pizza, 1 = logo
  const vueltas = useRef(0);

  // Contador de toques para el detalle escondido
  const toques = useRef(0);
  const ultimoToque = useRef(0);
  const mostrandoLogo = useRef(false);

  const lado = LADO_MIN + nivel * PASO;

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
    // Mientras se ve el logo, los toques no hacen nada
    if (mostrandoLogo.current) return;

    // Cuenta los toques seguidos
    const ahora = Date.now();
    toques.current = ahora - ultimoToque.current < TIEMPO_ENTRE_TOQUES ? toques.current + 1 : 1;
    ultimoToque.current = ahora;

    if (toques.current >= TOQUES_PARA_LOGO) {
      toques.current = 0;
      mostrarLogo();
      return;
    }

    // Toque normal: brinquito y media vuelta
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
  const girar = vuelta.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const sombraEscala = brinco.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  // Volteo tipo moneda (sin efecto 3D): la pizza se "aplasta" de lado
  // hasta desaparecer y el logo se "desaplasta" en su lugar
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
      accessibilityLabel={`${tamano.nombre}, ${textoRebanadas}${tamano.precio} pesos`}
    >
      <Animated.View
        style={[
          styles.tarjeta,
          { backgroundColor: tema.card, transform: [{ scale: presion }] },
        ]}
      >
        <View style={styles.caja}>
          {/* Sombrita bajo la pizza (no gira) */}
          <Animated.View
            style={[
              styles.sombra,
              {
                width: lado * 0.8,
                backgroundColor: modoOscuro ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)',
                transform: [{ scaleX: sombraEscala }],
              },
            ]}
          />

          {/* Cara 1: la pizza (dentro de una capa que hace el volteo) */}
          <Animated.View style={{ opacity: pizzaOpacidad, transform: [{ scaleX: pizzaAncho }] }}>
            <Animated.View style={{ transform: [{ translateY: subir }, { rotate: girar }] }}>
              <PizzaRealista
                size={lado}
                rebanadas={tamano.rebanadas}
                nivel={nivel}
                clave={`tam${nivel}`}
                retraso={nivel * 90}
              />
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

        <Text style={[styles.nombre, { color: tema.texto }]}>{tamano.nombre}</Text>
        {tamano.rebanadas ? (
          <Text style={[styles.rebanadas, { color: tema.textoSecundario }]}>
            {tamano.rebanadas} rebanadas
          </Text>
        ) : null}
        <Text style={[styles.precio, { color: tema.precio }]}>${tamano.precio}</Text>
      </Animated.View>
    </Pressable>
  );
}

// Solo se redibuja si cambia su tamaño o su lugar en la lista
export default memo(TarjetaTamano);

const styles = StyleSheet.create({
  tarjeta: {
    width: 104,
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  caja: {
    height: ALTO_CAJA,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },
  rebanadas: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
  },
  precio: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    marginTop: 4,
  },
});