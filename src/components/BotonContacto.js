// src/components/BotonContacto.js
// Botones de contacto de la sucursal: Llamar, WhatsApp y Cómo llegar.
// Usa los íconos de Ionicons (vienen con Expo): se ven igual de nítidos
// en iPhone y en Android porque son una fuente, no un dibujo a mano.
// El botón "Cómo llegar" usa el color de la marca (src/config/marca.js).
//
// Uso:
//   <BotonContacto tipo="llamar" onPress={llamar} />
//   <BotonContacto tipo="whatsapp" onPress={abrirWhats} />
//   <BotonContacto tipo="mapa" onPress={abrirMapa} />

import { useRef } from 'react';
import { Text, StyleSheet, Pressable, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/ThemeContext';
import { COLORES } from '../config/marca';

const TIPOS = {
  llamar: {
    icono: 'call',
    texto: 'Llamar',
    colores: ['#34C472', '#1F9D57'],
  },
  whatsapp: {
    icono: 'logo-whatsapp',
    texto: 'WhatsApp',
    colores: ['#3BE07A', '#1DB954'],
  },
  mapa: {
    icono: 'navigate',
    texto: 'Cómo llegar',
    colores: [COLORES.primarioClaro, COLORES.primario],
  },
};

export default function BotonContacto({ tipo = 'llamar', onPress, texto }) {
  const { tema, modoOscuro } = useTema();
  const config = TIPOS[tipo] ?? TIPOS.llamar;
  const escala = useRef(new Animated.Value(1)).current;

  const alPresionar = () => {
    Animated.spring(escala, { toValue: 0.94, friction: 6, tension: 220, useNativeDriver: true }).start();
  };
  const alSoltar = () => {
    Animated.spring(escala, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  };
  const alTocar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onPress) onPress();
  };

  return (
    <Pressable
      onPressIn={alPresionar}
      onPressOut={alSoltar}
      onPress={alTocar}
      style={styles.contenedor}
      accessibilityRole="button"
      accessibilityLabel={texto ?? config.texto}
    >
      <Animated.View
        style={[
          styles.tarjeta,
          {
            backgroundColor: tema.card,
            borderColor: modoOscuro ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            transform: [{ scale: escala }],
          },
        ]}
      >
        {/* Círculo con degradado y un aro suave del mismo color */}
        <View style={[styles.aro, { backgroundColor: config.colores[1] + '26' }]}>
          <LinearGradient
            colors={config.colores}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.circulo}
          >
            <Ionicons name={config.icono} size={26} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={[styles.texto, { color: tema.texto }]} numberOfLines={1}>
          {texto ?? config.texto}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  tarjeta: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 6,
  },
  aro: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  circulo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
});